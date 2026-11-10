-- Exam engine: every student-facing read/write of questions goes through these.
-- Correct answers leave the database only in check_answer() (practice mode,
-- after the student commits an answer) or get_attempt() once an attempt is submitted.

-- ---------- Browse questions (no answers) ----------
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
           exists (select 1 from public.bookmarks b where b.user_id = uid and b.question_id = q.id) as bookmarked
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
    order by q.id
    limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('total', total, 'items', res, 'premium', prem);
end $$;

-- ---------- Practice: reveal answer only after the student answers ----------
create or replace function public.check_answer(p_question bigint, p_option smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q public.questions; ok boolean;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_option is null or p_option not between 0 and 3 then raise exception 'bad_option'; end if;
  if not public.rate_ok('check_answer', 600, interval '1 hour') then raise exception 'rate_limited'; end if;
  select * into q from public.questions where id = p_question and is_active;
  if not found then raise exception 'not_found'; end if;
  if q.is_premium and not public.has_premium(uid) then raise exception 'premium_required'; end if;
  ok := (p_option = q.correct_option);
  insert into public.user_question_stats as s (user_id, question_id, attempts, correct_count, last_correct, last_seen_at)
  values (uid, q.id, 1, ok::int, ok, now())
  on conflict (user_id, question_id) do update
    set attempts = s.attempts + 1, correct_count = s.correct_count + ok::int, last_correct = ok, last_seen_at = now();
  return jsonb_build_object('correct', ok, 'correct_option', q.correct_option,
                            'explanation_en', q.explanation_en, 'explanation_bn', q.explanation_bn);
end $$;

-- ---------- Start an exam ----------
create or replace function public.start_attempt(
  p_mode text, p_mock_test int default null, p_subject int default null,
  p_exam int default null, p_count int default null, p_minutes int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean := public.has_premium(uid);
        t public.mock_tests; aid uuid; n int; mins int; allow_prem boolean := prem;
        mpq numeric := 1; neg numeric := 0; title_en text; title_bn text; ids bigint[];
        neg_default numeric := coalesce((select (value)::text::numeric from public.app_settings where key = 'default_negative_mark'), 0.25);
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
    if t.exam_id is not null then
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

-- ---------- Grade (internal) ----------
create or replace function public.finalize_attempt(p_attempt uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.test_attempts; c int; w int; s int;
begin
  select * into a from public.test_attempts where id = p_attempt for update;
  if not found or a.status = 'submitted' then return; end if;

  update public.attempt_answers aa set is_correct = (aa.selected_option = q.correct_option)
  from public.questions q where q.id = aa.question_id and aa.attempt_id = p_attempt and aa.selected_option is not null;

  select count(*) filter (where is_correct), count(*) filter (where is_correct = false),
         count(*) filter (where selected_option is null)
    into c, w, s from public.attempt_answers where attempt_id = p_attempt;

  update public.test_attempts set status = 'submitted', submitted_at = least(now(), expires_at + interval '30 seconds'),
         correct = c, wrong = w, skipped = s,
         score = round(c * marks_per_question - w * negative_mark, 2),
         max_score = total_questions * marks_per_question
  where id = p_attempt;

  insert into public.user_question_stats as st (user_id, question_id, attempts, correct_count, last_correct, last_seen_at)
  select a.user_id, question_id, 1, is_correct::int, is_correct, now()
  from public.attempt_answers where attempt_id = p_attempt and selected_option is not null
  on conflict (user_id, question_id) do update
    set attempts = st.attempts + 1, correct_count = st.correct_count + excluded.correct_count,
        last_correct = excluded.last_correct, last_seen_at = now();
end $$;
revoke execute on function public.finalize_attempt(uuid) from public, anon, authenticated;

create or replace function public.submit_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.test_attempts;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  perform public.finalize_attempt(p_attempt);
  select * into a from public.test_attempts where id = p_attempt;
  return jsonb_build_object('score', a.score, 'max_score', a.max_score, 'correct', a.correct,
                            'wrong', a.wrong, 'skipped', a.skipped);
end $$;

-- ---------- Save one answer ----------
create or replace function public.save_answer(p_attempt uuid, p_position int,
  p_selected smallint default null, p_marked boolean default null, p_clear boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare a public.test_attempts;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'in_progress' then raise exception 'already_submitted'; end if;
  if now() > a.expires_at + interval '30 seconds' then
    perform public.finalize_attempt(p_attempt);
    raise exception 'time_over';
  end if;
  if p_selected is not null and p_selected not between 0 and 3 then raise exception 'bad_option'; end if;
  update public.attempt_answers set
    selected_option = case when p_clear then null else coalesce(p_selected, selected_option) end,
    is_marked = coalesce(p_marked, is_marked)
  where attempt_id = p_attempt and position = p_position;
  return found;
end $$;

-- ---------- Read an attempt (answers only after submit) ----------
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
      'explanation_bn', case when done then q.explanation_bn end
    ) order by aa.position)
  into qs
  from public.attempt_answers aa join public.questions q on q.id = aa.question_id
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

-- ---------- Student dashboard ----------
create or replace function public.my_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); r jsonb;
begin
  if uid is null then raise exception 'auth_required'; end if;
  select jsonb_build_object(
    'tests_completed', (select count(*) from public.test_attempts where user_id = uid and status = 'submitted'),
    'questions_attempted', (select coalesce(sum(attempts),0) from public.user_question_stats where user_id = uid),
    'correct_answers', (select coalesce(sum(correct_count),0) from public.user_question_stats where user_id = uid),
    'unique_questions', (select count(*) from public.user_question_stats where user_id = uid),
    'total_questions', (select count(*) from public.questions where is_active),
    'average_percent', (select round(avg(case when max_score > 0 then score * 100 / max_score end), 1)
                        from public.test_attempts where user_id = uid and status = 'submitted'),
    'best_percent', (select round(max(case when max_score > 0 then score * 100 / max_score end), 1)
                     from public.test_attempts where user_id = uid and status = 'submitted'),
    'bookmarks', (select count(*) from public.bookmarks where user_id = uid),
    'wrong_questions', (select count(*) from public.user_question_stats where user_id = uid and last_correct = false),
    'premium', public.has_premium(uid),
    'subjects', (select coalesce(jsonb_agg(jsonb_build_object('subject_id', s.id, 'name_en', s.name_en, 'name_bn', s.name_bn,
                   'attempts', x.att, 'correct', x.cor) order by s.sort_order), '[]'::jsonb)
                 from (select q.subject_id, sum(st.attempts) att, sum(st.correct_count) cor
                       from public.user_question_stats st join public.questions q on q.id = st.question_id
                       where st.user_id = uid group by q.subject_id) x join public.subjects s on s.id = x.subject_id),
    'recent', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
                 select id, mode, title_en, title_bn, status, started_at, submitted_at, score, max_score, correct, wrong, skipped, total_questions
                 from public.test_attempts where user_id = uid order by started_at desc limit 10) t)
  ) into r;
  return r;
end $$;

-- ---------- Admin analytics ----------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'new_users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'premium_users', (select count(distinct user_id) from public.subscriptions where plan = 'lifetime' and status = 'active'),
    'questions', (select count(*) from public.questions),
    'premium_questions', (select count(*) from public.questions where is_premium),
    'attempts', (select count(*) from public.test_attempts where status = 'submitted'),
    'attempts_7d', (select count(*) from public.test_attempts where status = 'submitted' and submitted_at > now() - interval '7 days'),
    'revenue', (select coalesce(sum(amount),0) from public.payments where status = 'paid'),
    'revenue_30d', (select coalesce(sum(amount),0) from public.payments where status = 'paid' and verified_at > now() - interval '30 days'),
    'avg_percent', (select round(avg(case when max_score > 0 then score*100/max_score end),1) from public.test_attempts where status = 'submitted'),
    'subjects', (select coalesce(jsonb_agg(jsonb_build_object('name_en', s.name_en, 'name_bn', s.name_bn,
                   'questions', (select count(*) from public.questions q where q.subject_id = s.id),
                   'answered', coalesce(x.att,0), 'correct', coalesce(x.cor,0)) order by s.sort_order), '[]'::jsonb)
                 from public.subjects s left join (
                   select q.subject_id, sum(st.attempts) att, sum(st.correct_count) cor
                   from public.user_question_stats st join public.questions q on q.id = st.question_id group by q.subject_id) x
                 on x.subject_id = s.id),
    'top_students', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
                 select p.full_name, count(*) tests, round(avg(a.score*100/nullif(a.max_score,0)),1) avg_percent
                 from public.test_attempts a join public.profiles p on p.id = a.user_id
                 where a.status = 'submitted' group by p.id, p.full_name
                 order by avg_percent desc nulls last limit 10) t)
  );
end $$;

-- Admin: list users with email & premium flag
create or replace function public.admin_list_users(p_search text default null, p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select p.id, p.full_name, p.phone, p.role, p.created_at, u.email, u.last_sign_in_at,
           public.has_premium(p.id) as premium,
           (select count(*) from public.test_attempts a where a.user_id = p.id and a.status = 'submitted') as tests
    from public.profiles p join auth.users u on u.id = p.id
    where p_search is null or p_search = '' or u.email ilike '%'||p_search||'%'
       or p.full_name ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%'
    order by p.created_at desc limit least(p_limit, 200) offset p_offset) t);
end $$;

-- ---------- Pricing & payments ----------
-- Price quote (no side effects). Usable by the server to compute the amount to charge.
create or replace function public.quote_price(p_plan text, p_test int default null, p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base numeric; c public.coupons; disc numeric := 0;
begin
  if p_plan = 'lifetime' then
    base := (select (value)::text::numeric from public.app_settings where key = 'price_lifetime');
  elsif p_plan = 'single_test' then
    if not exists (select 1 from public.mock_tests where id = p_test and is_premium) then raise exception 'not_premium_test'; end if;
    base := coalesce((select price from public.mock_tests where id = p_test),
                     (select (value)::text::numeric from public.app_settings where key = 'price_single_test'));
  else raise exception 'bad_plan'; end if;
  if p_coupon is not null and p_coupon <> '' then
    select * into c from public.coupons where upper(code) = upper(p_coupon) and is_active
      and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses);
    if found then
      disc := case when c.discount_type = 'percent' then round(base * least(c.value,100) / 100, 0) else least(c.value, base) end;
    end if;
  end if;
  return jsonb_build_object('base', base, 'discount', disc, 'amount', greatest(base - disc, 0),
                            'coupon_id', c.id, 'coupon_valid', c.id is not null);
end $$;

-- Called ONLY by the server (service role) after the gateway confirms the payment.
create or replace function public.grant_payment(p_payment uuid, p_txn text, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if p.status = 'paid' then return true; end if;        -- idempotent
  if p.status <> 'pending' then return false; end if;
  update public.payments set status = 'paid', gateway_txn_id = p_txn, gateway_payload = p_payload, verified_at = now()
    where id = p_payment;
  insert into public.subscriptions (user_id, plan, mock_test_id, payment_id)
    values (p.user_id, p.plan, p.mock_test_id, p.id);
  if p.coupon_id is not null then
    update public.coupons set used_count = used_count + 1 where id = p.coupon_id;
  end if;
  return true;
end $$;
revoke execute on function public.grant_payment(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_grant_premium(p_user uuid, p_plan text default 'lifetime', p_test int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into public.subscriptions (user_id, plan, mock_test_id, granted_by) values (p_user, p_plan, p_test, auth.uid());
end $$;
