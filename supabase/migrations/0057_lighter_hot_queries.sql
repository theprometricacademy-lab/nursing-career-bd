-- 14 Nov 2026, 18:05-18:12 Dhaka: the database could not keep up with the Saturday peak (ad + weekly test) and
-- requests timed out. The two heaviest public calls did their sorting on full question rows; they now pick the
-- ids first and read the full rows only for the handful that are returned. Results are the same as before.

create or replace function public.list_questions(p_subject integer default null, p_topic integer default null,
  p_exam integer default null, p_year integer default null, p_difficulty text default null, p_search text default null,
  p_filter text default 'all', p_limit integer default 20, p_offset integer default 0, p_seed integer default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid); res jsonb; total int;
  shuffle boolean := p_seed is not null and p_exam is null and coalesce(p_search, '') = '';
  mix boolean;
  fpos int[] := '{0,1,2,3,6,7,8,9,11,12,13,14,15,17,18,19}';
  ppos int[] := '{4,5,10,16,20}';
begin
  p_limit := least(greatest(p_limit, 1), 100);
  mix := shuffle and not prem and coalesce(p_filter, 'all') = 'all';

  with f as materialized (            -- matching questions: id and what the order needs, nothing else
    select q.id, q.is_premium, case when shuffle then md5(q.id::text || p_seed::text) end as h
    from public.questions q
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
      and exists (select 1 from public.subjects sj where sj.id = q.subject_id)
  ), z as (
    select f.id, f.is_premium, f.h,
           (row_number() over (partition by f.is_premium order by f.h, f.id) - 1)::int as r,
           row_number() over (order by f.h, f.id) as base_rank
    from f
  ), y as (
    select z.id, z.h,
           case when not mix then z.base_rank
                when z.is_premium then (z.r / 5) * 21 + ppos[(z.r % 5) + 1]
                else (z.r / 16) * 21 + fpos[(z.r % 16) + 1] end as k
    from z
  ), pg as (                          -- the one page that is returned
    select t.id, t.ord from (select y.id, row_number() over (order by y.k, y.h, y.id) as ord from y) t
    order by t.ord limit p_limit offset p_offset
  )
  select (select count(*) from f), coalesce(jsonb_agg(row_to_json(x) order by x.ord), '[]'::jsonb) into total, res
  from (
    select q.id, q.code, q.subject_id, q.topic_id, q.exam_id, q.year, q.difficulty, q.is_premium,
           (q.is_premium and not prem) as locked,
           case when q.is_premium and not prem then null else q.question_en end as question_en,
           case when q.is_premium and not prem then null else q.question_bn end as question_bn,
           case when q.is_premium and not prem then null else q.options_en end as options_en,
           case when q.is_premium and not prem then null else q.options_bn end as options_bn,
           exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id) as bookmarked,
           coalesce(q.exam_lang, sj.exam_lang) as exam_lang, sj.translatable, pg.ord
    from pg join public.questions q on q.id = pg.id join public.subjects sj on sj.id = q.subject_id
  ) x;
  return jsonb_build_object('total', total, 'items', res, 'premium', prem);
end $$;

create or replace function public.public_quick_quiz(p_count integer default 5)
returns table(id bigint, question_bn text, options_bn text[], correct_option smallint, explanation_bn text, subject_bn text)
language sql security definer set search_path = public as $$
  select q.id, q.question_bn, q.options_bn, q.correct_option, q.explanation_bn, s.name_bn
  from public.questions q join public.subjects s on s.id = q.subject_id
  where q.id in (
    select q2.id from public.questions q2
    where q2.is_active and not q2.is_premium and array_length(q2.options_bn, 1) = 4
      and q2.explanation_bn is not null and q2.explanation_bn not like 'সঠিক উত্তর:%'
      and q2.subject_id in (1, 2, 3, 4, 5, 6, 7, 10, 11, 12)
      and length(q2.question_bn) < 220
    order by random()
    limit least(greatest(coalesce(p_count, 5), 1), 10))
  order by random()
$$;
