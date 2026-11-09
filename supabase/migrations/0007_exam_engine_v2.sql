-- Exam engine v2: exam language per question, blueprint mock tests

create or replace function public.list_questions(
  p_subject int default null, p_topic int default null, p_exam int default null,
  p_year int default null, p_difficulty text default null, p_search text default null,
  p_filter text default 'all',          -- all | bookmarked | wrong
  p_limit int default 20, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid); res jsonb; total int;
begin
  p_limit := least(greatest(p_limit, 1), 100);
  with base as (
    select q.* from public.questions q
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

  select coalesce(jsonb_agg(row_to_json(x) order by x.id), '[]'::jsonb) into res from (
    select q.id, q.code, q.subject_id, q.topic_id, q.exam_id, q.year, q.difficulty, q.is_premium,
           (q.is_premium and not prem) as locked,
           case when q.is_premium and not prem then null else q.question_en end as question_en,
           case when q.is_premium and not prem then null else q.question_bn end as question_bn,
           case when q.is_premium and not prem then null else q.options_en end as options_en,
           case when q.is_premium and not prem then null else q.options_bn end as options_bn,
           exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id) as bookmarked,
           coalesce(q.exam_lang, sj.exam_lang) as exam_lang, sj.translatable
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
    order by q.id
    limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('total', total, 'items', res, 'premium', prem);
end $$;

create or replace function public.start_attempt(
  p_mode text, p_mock_test int default null, p_subject int default null,
  p_exam int default null, p_count int default null, p_minutes int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid);
        t public.mock_tests; aid uuid; n int; mins int; allow_prem boolean := prem;
        mpq numeric := 1; neg numeric := 0; title_en text; title_bn text; ids bigint[];
        neg_default numeric := coalesce((select (value)::text::numeric from public.app_settings where key = 'default_negative_mark'), 0.5);
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not public.rate_ok('start_attempt', 40, interval '1 hour') then raise exception 'rate_limited'; end if;

  if p_mode = 'mock' then
    select * into t from public.mock_tests where id = p_mock_test and is_published;
    if not found then raise exception 'not_found'; end if;
    if not public.can_take_test(t.id, uid) then raise exception 'premium_required'; end if;
    allow_prem := prem or t.is_premium;  -- a purchased/premium test may use premium questions
    n := t.question_count; mins := t.duration_minutes; mpq := t.marks_per_question; neg := t.negative_mark;
    title_en := t.title_en; title_bn := t.title_bn;
    if t.blueprint is not null and t.exam_id is null then
      select array_agg(z.id order by z.ord, z.rnd) into ids from (
        select q.id, x.ord, random() as rnd,
               row_number() over (partition by x.sec order by random()) as rn,
               coalesce((t.blueprint->>x.sec)::int, 0) as lim
        from public.questions q
        join public.subjects s on s.id = q.subject_id
        join (values ('bangla',1),('english',2),('gk',3),('nursing',4)) x(sec, ord) on x.sec = public.subject_section(s)
        where q.is_active and s.is_active and (allow_prem or not q.is_premium)
      ) z where z.rn <= z.lim;
    elsif t.exam_id is not null then
      select array_agg(id order by case when t.shuffle_questions then random() else id end) into ids
      from (select id from public.questions where exam_id = t.exam_id and is_active
              and (allow_prem or not is_premium) order by id limit n) s;
    else
      select array_agg(id) into ids from (
        select id from public.questions
        where is_active and (allow_prem or not is_premium)
          and (t.subject_ids is null or subject_id = any(t.subject_ids))
        order by random() limit n) s;
    end if;

  elsif p_mode = 'pyq' then
    if p_exam is null then raise exception 'exam_required'; end if;
    select name_en || ' ' || year, name_bn || ' ' || year into title_en, title_bn from public.exams where id = p_exam;
    select array_agg(id order by id) into ids from public.questions
      where exam_id = p_exam and is_active and (prem or not is_premium);
    n := coalesce(array_length(ids,1),0); mins := greatest(n, 5); neg := neg_default;

  elsif p_mode = 'daily' then
    title_en := 'Daily Quiz ' || to_char(current_date, 'DD Mon YYYY');
    title_bn := 'ডেইলি কুইজ ' || to_char(current_date, 'DD-MM-YYYY');
    select array_agg(id) into ids from (
      select id from public.questions where is_active and not is_premium
      order by md5(id::text || current_date::text) limit 10) s;
    mins := 10;

  elsif p_mode = 'custom' then
    n := least(greatest(coalesce(p_count, 20), 5), 100);
    mins := least(greatest(coalesce(p_minutes, n), 5), 180);
    neg := neg_default;
    select coalesce(name_en,'All subjects') || ' practice test', coalesce(name_bn,'সব বিষয়') || ' অনুশীলন পরীক্ষা'
      into title_en, title_bn from (select 1) d left join public.subjects s on s.id = p_subject;
    select array_agg(id) into ids from (
      select id from public.questions where is_active and (prem or not is_premium)
        and (p_subject is null or subject_id = p_subject)
      order by random() limit n) s;
  else
    raise exception 'bad_mode';
  end if;

  if ids is null or array_length(ids,1) is null then raise exception 'no_questions'; end if;

  insert into public.test_attempts (user_id, mock_test_id, mode, title_en, title_bn, expires_at,
                                    marks_per_question, negative_mark, total_questions)
  values (uid, case when p_mode = 'mock' then p_mock_test end, p_mode, title_en, title_bn,
          now() + make_interval(mins => mins), mpq, neg, array_length(ids,1))
  returning id into aid;

  insert into public.attempt_answers (attempt_id, position, question_id, option_order)
  select aid, o.pos, o.qid,
         case when p_mode = 'mock' and not t.shuffle_options then array[0,1,2,3]::smallint[]
              else (select array_agg(x order by random())::smallint[] from unnest(array[0,1,2,3]) x) end
  from unnest(ids) with ordinality as o(qid, pos);

  return aid;
end $$;

create or replace function public.get_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.test_attempts; done boolean; qs jsonb; subj jsonb;
begin
  select * into a from public.test_attempts where id = p_attempt and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'not_found'; end if;
  if a.status = 'in_progress' and now() > a.expires_at + interval '30 seconds' then
    perform public.finalize_attempt(p_attempt);
    select * into a from public.test_attempts where id = p_attempt;
  end if;
  done := a.status = 'submitted';

  select jsonb_agg(jsonb_build_object(
      'position', aa.position, 'question_id', q.id, 'code', q.code, 'subject_id', q.subject_id,
      'question_en', q.question_en, 'question_bn', q.question_bn,
      'options', (select jsonb_agg(jsonb_build_object('idx', o, 'en', q.options_en[o+1], 'bn', q.options_bn[o+1]) order by ord)
                  from unnest(aa.option_order) with ordinality u(o, ord)),
      'selected', aa.selected_option, 'marked', aa.is_marked,
      'correct_option', case when done then q.correct_option end,
      'is_correct', case when done then aa.is_correct end,
      'explanation_en', case when done then q.explanation_en end,
      'explanation_bn', case when done then q.explanation_bn end,
      'exam_lang', coalesce(q.exam_lang, sj.exam_lang), 'translatable', sj.translatable
    ) order by aa.position)
  into qs
  from public.attempt_answers aa join public.questions q on q.id = aa.question_id
  join public.subjects sj on sj.id = q.subject_id
  where aa.attempt_id = p_attempt;

  if done then
    select jsonb_agg(jsonb_build_object('subject_id', s.id, 'name_en', s.name_en, 'name_bn', s.name_bn,
             'total', x.total, 'correct', x.correct) order by s.sort_order) into subj
    from (select q.subject_id, count(*) total, count(*) filter (where aa.is_correct) correct
          from public.attempt_answers aa join public.questions q on q.id = aa.question_id
          where aa.attempt_id = p_attempt group by q.subject_id) x
    join public.subjects s on s.id = x.subject_id;
  end if;

  return jsonb_build_object('id', a.id, 'mode', a.mode, 'title_en', a.title_en, 'title_bn', a.title_bn,
    'status', a.status, 'started_at', a.started_at, 'expires_at', a.expires_at, 'submitted_at', a.submitted_at,
    'server_now', now(), 'total_questions', a.total_questions, 'marks_per_question', a.marks_per_question,
    'negative_mark', a.negative_mark, 'correct', a.correct, 'wrong', a.wrong, 'skipped', a.skipped,
    'score', a.score, 'max_score', a.max_score, 'questions', coalesce(qs, '[]'::jsonb),
    'subjects', coalesce(subj, '[]'::jsonb));
end $$;
