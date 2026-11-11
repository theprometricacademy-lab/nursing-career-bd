-- 1) Premium members: no hourly limits on checking answers.
-- 2) Free visitors browsing the shuffled question bank see free and locked premium questions mixed in a
--    fixed rhythm: 4 free, 2 premium, 4 free, 1 premium, 5 free, 1 premium, 3 free, 1 premium (then repeat).
create or replace function public.answer_keys(p_ids bigint[])
returns table (id bigint, correct_option smallint, explanation_en text, explanation_bn text)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then return; end if;
  if array_length(p_ids, 1) > 50 then raise exception 'too_many'; end if;
  prem := public.has_premium(uid);
  if not prem and not public.rate_ok('answer_keys', 60, interval '1 hour') then raise exception 'rate_limited'; end if;
  return query
    select q.id, q.correct_option::smallint, q.explanation_en, q.explanation_bn
    from public.questions q
    where q.id = any(p_ids) and q.is_active and (not q.is_premium or prem);
end $$;

create or replace function public.check_answer(p_question bigint, p_option smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q public.questions; ok boolean; prem boolean;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_option is null or p_option not between 0 and 3 then raise exception 'bad_option'; end if;
  prem := public.has_premium(uid);
  if not prem and not public.rate_ok('check_answer', 600, interval '1 hour') then raise exception 'rate_limited'; end if;
  select * into q from public.questions where id = p_question and is_active;
  if not found then raise exception 'not_found'; end if;
  if q.is_premium and not prem then raise exception 'premium_required'; end if;
  ok := (p_option = q.correct_option);
  insert into public.user_question_stats as s (user_id, question_id, attempts, correct_count, last_correct, last_seen_at)
  values (uid, q.id, 1, ok::int, ok, now())
  on conflict (user_id, question_id) do update
    set attempts = s.attempts + 1, correct_count = s.correct_count + ok::int, last_correct = ok, last_seen_at = now();
  return jsonb_build_object('correct', ok, 'correct_option', q.correct_option,
                            'explanation_en', q.explanation_en, 'explanation_bn', q.explanation_bn);
end $$;

create or replace function public.list_questions(p_subject integer default null, p_topic integer default null, p_exam integer default null,
  p_year integer default null, p_difficulty text default null, p_search text default null, p_filter text default 'all',
  p_limit integer default 20, p_offset integer default 0, p_seed integer default null)
returns jsonb language plpgsql stable security definer set search_path = public as $function$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid); res jsonb; total int;
  shuffle boolean := p_seed is not null and p_exam is null and coalesce(p_search, '') = '';
  mix boolean;
  -- positions inside a 21-slot cycle: 16 free + 5 premium
  fpos int[] := '{0,1,2,3,6,7,8,9,11,12,13,14,15,17,18,19}';
  ppos int[] := '{4,5,10,16,20}';
begin
  p_limit := least(greatest(p_limit, 1), 100);
  mix := shuffle and not prem and coalesce(p_filter, 'all') = 'all';
  with base as (
    select q.id from public.questions q
    where q.is_active
      and (p_subject is null or q.subject_id = p_subject)
      and (p_topic is null or q.topic_id = p_topic)
      and (p_exam is null or q.exam_id = p_exam)
      and (p_year is null or q.year = p_year)
      and (p_difficulty is null or q.difficulty = p_difficulty)
      and (p_search is null or p_search = '' or q.question_en ilike '%'||p_search||'%'
           or q.question_bn ilike '%'||p_search||'%' or q.code ilike p_search)
      and (p_filter <> 'bookmarked' or exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id))
      and (p_filter <> 'wrong' or exists (select 1 from public.user_question_stats s
                                           where s.user_id = uid and s.question_id = q.id and s.last_correct = false))
  )
  select count(*) into total from base;

  select coalesce(jsonb_agg(row_to_json(x) order by x.ord), '[]'::jsonb) into res from (
    select y.id, y.code, y.subject_id, y.topic_id, y.exam_id, y.year, y.difficulty, y.is_premium, y.locked,
           y.question_en, y.question_bn, y.options_en, y.options_bn, y.bookmarked, y.exam_lang, y.translatable,
           row_number() over (order by y.k, y.h, y.id) as ord
    from (
      select z.*,
             case when not mix then z.base_rank
                  when z.is_premium then (z.r / 5) * 21 + ppos[(z.r % 5) + 1]
                  else (z.r / 16) * 21 + fpos[(z.r % 16) + 1] end as k
      from (
        select q.id, q.code, q.subject_id, q.topic_id, q.exam_id, q.year, q.difficulty, q.is_premium,
               (q.is_premium and not prem) as locked,
               case when q.is_premium and not prem then null else q.question_en end as question_en,
               case when q.is_premium and not prem then null else q.question_bn end as question_bn,
               case when q.is_premium and not prem then null else q.options_en end as options_en,
               case when q.is_premium and not prem then null else q.options_bn end as options_bn,
               exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id) as bookmarked,
               coalesce(q.exam_lang, sj.exam_lang) as exam_lang, sj.translatable,
               case when shuffle then md5(q.id::text || p_seed::text) end as h,
               (row_number() over (partition by q.is_premium order by case when shuffle then md5(q.id::text || p_seed::text) end, q.id) - 1)::int as r,
               row_number() over (order by case when shuffle then md5(q.id::text || p_seed::text) end, q.id) as base_rank
        from public.questions q join public.subjects sj on sj.id = q.subject_id
        where q.is_active
          and (p_subject is null or q.subject_id = p_subject)
          and (p_topic is null or q.topic_id = p_topic)
          and (p_exam is null or q.exam_id = p_exam)
          and (p_year is null or q.year = p_year)
          and (p_difficulty is null or q.difficulty = p_difficulty)
          and (p_search is null or p_search = '' or q.question_en ilike '%'||p_search||'%'
               or q.question_bn ilike '%'||p_search||'%' or q.code ilike p_search)
          and (p_filter <> 'bookmarked' or exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id))
          and (p_filter <> 'wrong' or exists (select 1 from public.user_question_stats s
                                               where s.user_id = uid and s.question_id = q.id and s.last_correct = false))
      ) z
    ) y
    order by y.k, y.h, y.id
    limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('total', total, 'items', res, 'premium', prem);
end $function$;
