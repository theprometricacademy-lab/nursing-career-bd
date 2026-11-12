-- Weekly test: premium members get their own set drawn from the premium question bank;
-- everyone else keeps the free + previous-year set. Same layout (Bangla 8, English 8, GK 9, Nursing 25), same ranking.
alter table public.weekly_tests add column if not exists premium_ids bigint[];

drop function if exists public.weekly_test_ensure(date);
create or replace function public.weekly_test_ensure(p_week date, p_premium boolean default false)
returns bigint[] language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  select case when p_premium then premium_ids else question_ids end into ids from weekly_tests where week_start = p_week;
  if array_length(ids, 1) is not null then return ids; end if;   -- '{}' = premium set made first, free set not yet
  with quota(sec, ord, n) as (values ('bangla', 1, 8), ('english', 2, 8), ('gk', 3, 9), ('nursing', 4, 25)),
  recent as (select unnest(case when p_premium then w.premium_ids else w.question_ids end) id
             from weekly_tests w where w.week_start >= p_week - 28 and w.week_start < p_week),
  pool as (
    select q.id,
           case when q.subject_id = 15 then 'bangla' when q.subject_id = 16 then 'english'
                when q.subject_id in (13, 14, 20) then 'gk' when q.subject_id between 1 and 12 then 'nursing' end as sec,
           md5(q.id::text || p_week::text || p_premium::text) as rnd
    from questions q
    where q.is_active and q.difficulty in ('medium', 'hard')
      and (case when p_premium then q.is_premium else (not q.is_premium or q.exam_id is not null) end)
      and q.question_bn is not null and array_length(q.options_bn, 1) = 4 and q.correct_option between 0 and 3
      and not (coalesce(q.question_bn, '') || ' ' || array_to_string(q.options_bn, ' ') || ' ' || coalesce(q.explanation_bn, ''))
              ~ '(মুজিব|বঙ্গবন্ধু|হাসিনা)'
      and q.id not in (select id from recent where id is not null)),
  ranked as (select p.id, p.sec, p.rnd, row_number() over (partition by p.sec order by p.rnd) rn from pool p where p.sec is not null)
  select array_agg(r.id order by u.ord, r.rnd) into ids from ranked r join quota u on u.sec = r.sec where r.rn <= u.n;
  if p_premium then
    insert into weekly_tests (week_start, question_ids, premium_ids) values (p_week, '{}', ids)
      on conflict (week_start) do update set premium_ids = coalesce(weekly_tests.premium_ids, excluded.premium_ids);
    select premium_ids into ids from weekly_tests where week_start = p_week;
  else
    insert into weekly_tests (week_start, question_ids) values (p_week, ids)
      on conflict (week_start) do update set question_ids = case when weekly_tests.question_ids = '{}' then excluded.question_ids else weekly_tests.question_ids end;
    select question_ids into ids from weekly_tests where week_start = p_week;
  end if;
  return ids;
end $$;
revoke all on function public.weekly_test_ensure(date, boolean) from public, anon, authenticated;

create or replace function public.start_weekly_test()
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); wk date := bd_week_start(now()); ids bigint[]; a test_attempts; aid uuid;
        we timestamptz := ((wk + 7)::timestamp at time zone 'Asia/Dhaka');
begin
  if uid is null then raise exception 'auth_required'; end if;
  select * into a from test_attempts where user_id = uid and mode = 'weekly' and week_start = wk order by started_at limit 1;
  if found then
    if a.status = 'in_progress' and a.expires_at > now() then return a.id; end if;
    if a.status = 'in_progress' then perform finalize_attempt(a.id); end if;
    raise exception 'already_taken';
  end if;
  ids := weekly_test_ensure(wk, has_premium(uid));
  if ids is null or array_length(ids, 1) is null then raise exception 'no_questions'; end if;
  insert into test_attempts (user_id, mode, week_start, title_en, title_bn, expires_at, marks_per_question, negative_mark, total_questions)
  values (uid, 'weekly', wk, 'Weekly model test', 'সাপ্তাহিক মডেল টেস্ট',
          least(now() + interval '40 minutes', we + interval '5 minutes'), 1, 0.5, array_length(ids, 1))
  returning id into aid;
  insert into attempt_answers (attempt_id, position, question_id, option_order)
  select aid, o.pos, o.qid, (select array_agg(x order by random())::smallint[] from unnest(array[0, 1, 2, 3]) x)
  from unnest(ids) with ordinality as o(qid, pos);
  return aid;
end $$;
