-- Mock tests draw only medium and hard questions (no easy ones).
-- Real previous-paper tests (exam_id set) still use the full paper as it was.
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
    allow_prem := prem or t.is_premium;
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
          and q.difficulty in ('medium','hard')
      ) z where z.rn <= z.lim;
    elsif t.exam_id is not null then
      select array_agg(id order by case when t.shuffle_questions then random() else id end) into ids
      from (select id from public.questions where exam_id = t.exam_id and is_active
              and (allow_prem or not is_premium) order by id limit n) s;
    else
      select array_agg(id) into ids from (
        select id from public.questions
        where is_active and (allow_prem or not is_premium)
          and difficulty in ('medium','hard')
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
