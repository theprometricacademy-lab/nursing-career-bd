-- Question bank: optional shuffle seed so every visit starts with different questions.
-- With a seed the order is md5(id||seed) — stable for "load more" pages within one visit.
-- Exam papers (p_exam) and searches keep the natural order.
drop function if exists public.list_questions(integer, integer, integer, integer, text, text, text, integer, integer);
create or replace function public.list_questions(p_subject integer default null, p_topic integer default null, p_exam integer default null,
  p_year integer default null, p_difficulty text default null, p_search text default null, p_filter text default 'all',
  p_limit integer default 20, p_offset integer default 0, p_seed integer default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid); res jsonb; total int;
  shuffle boolean := p_seed is not null and p_exam is null and coalesce(p_search, '') = '';
begin
  p_limit := least(greatest(p_limit, 1), 100);
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
    select q.id, q.code, q.subject_id, q.topic_id, q.exam_id, q.year, q.difficulty, q.is_premium,
           (q.is_premium and not prem) as locked,
           case when q.is_premium and not prem then null else q.question_en end as question_en,
           case when q.is_premium and not prem then null else q.question_bn end as question_bn,
           case when q.is_premium and not prem then null else q.options_en end as options_en,
           case when q.is_premium and not prem then null else q.options_bn end as options_bn,
           exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id) as bookmarked,
           coalesce(q.exam_lang, sj.exam_lang) as exam_lang, sj.translatable,
           row_number() over (order by case when shuffle then md5(q.id::text || p_seed::text) end, q.id) as ord
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
    order by case when shuffle then md5(q.id::text || p_seed::text) end, q.id
    limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('total', total, 'items', res, 'premium', prem);
end $function$;
grant execute on function public.list_questions(integer, integer, integer, integer, text, text, text, integer, integer, integer) to anon, authenticated;
