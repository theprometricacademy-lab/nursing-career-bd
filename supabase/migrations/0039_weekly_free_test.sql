-- Free weekly model test: a new 50-question set every Saturday (Bangladesh time), open all week so people
-- with hospital shifts can sit it whenever they like. One attempt per user per week; everyone who sat it is
-- ranked (score, then time taken). Questions come only from the free set and from previous-year papers.

alter table public.test_attempts drop constraint if exists test_attempts_mode_check;
alter table public.test_attempts add constraint test_attempts_mode_check
  check (mode = any (array['mock', 'daily', 'pyq', 'custom', 'weekly']));
alter table public.test_attempts add column if not exists week_start date;
create index if not exists test_attempts_weekly_idx on public.test_attempts (week_start, status) where mode = 'weekly';

create table if not exists public.weekly_tests (
  week_start date primary key,
  question_ids bigint[] not null,
  created_at timestamptz not null default now()
);
alter table public.weekly_tests enable row level security;   -- only reached through the functions below

-- Saturday that starts the Bangladesh-time week containing p_at
create or replace function public.bd_week_start(p_at timestamptz default now())
returns date language sql immutable as $$
  select ((p_at at time zone 'Asia/Dhaka')::date - ((extract(dow from (p_at at time zone 'Asia/Dhaka'))::int + 1) % 7))::date
$$;

-- Creates the week's question set the first time anyone asks for it (so it starts by itself every week).
-- 50 questions in exam order: Bangla 8, English 8, GK 9, Nursing 25; medium/hard; free or previous-year only;
-- nothing used in the previous 4 weeks.
create or replace function public.weekly_test_ensure(p_week date)
returns bigint[] language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  select question_ids into ids from weekly_tests where week_start = p_week;
  if ids is not null then return ids; end if;
  with quota(sec, ord, n) as (values ('bangla', 1, 8), ('english', 2, 8), ('gk', 3, 9), ('nursing', 4, 25)),
  pool as (
    select q.id,
           case when q.subject_id = 15 then 'bangla' when q.subject_id = 16 then 'english'
                when q.subject_id in (13, 14, 20) then 'gk' when q.subject_id between 1 and 12 then 'nursing' end as sec,
           md5(q.id::text || p_week::text) as rnd
    from questions q
    where q.is_active and q.difficulty in ('medium', 'hard') and (not q.is_premium or q.exam_id is not null)
      and q.question_bn is not null and array_length(q.options_bn, 1) = 4 and q.correct_option between 0 and 3
      and not (coalesce(q.question_bn, '') || ' ' || array_to_string(q.options_bn, ' ') || ' ' || coalesce(q.explanation_bn, ''))
              ~ '(মুজিব|বঙ্গবন্ধু|হাসিনা)'
      and q.id not in (select unnest(w.question_ids) from weekly_tests w where w.week_start >= p_week - 28 and w.week_start < p_week)),
  ranked as (select p.id, p.sec, p.rnd, row_number() over (partition by p.sec order by p.rnd) rn from pool p where p.sec is not null)
  select array_agg(r.id order by u.ord, r.rnd) into ids from ranked r join quota u on u.sec = r.sec where r.rn <= u.n;
  insert into weekly_tests (week_start, question_ids) values (p_week, ids) on conflict (week_start) do nothing;
  select question_ids into ids from weekly_tests where week_start = p_week;
  return ids;
end $$;
revoke all on function public.weekly_test_ensure(date) from public, anon, authenticated;

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
  ids := weekly_test_ensure(wk);
  if ids is null or array_length(ids, 1) is null then raise exception 'no_questions'; end if;
  insert into test_attempts (user_id, mode, week_start, title_en, title_bn, expires_at, marks_per_question, negative_mark, total_questions)
  values (uid, 'weekly', wk, 'Free weekly model test', 'সাপ্তাহিক ফ্রি মডেল টেস্ট',
          least(now() + interval '40 minutes', we + interval '5 minutes'), 1, 0.5, array_length(ids, 1))
  returning id into aid;
  insert into attempt_answers (attempt_id, position, question_id, option_order)
  select aid, o.pos, o.qid, (select array_agg(x order by random())::smallint[] from unnest(array[0, 1, 2, 3]) x)
  from unnest(ids) with ordinality as o(qid, pos);
  return aid;
end $$;
revoke all on function public.start_weekly_test() from public, anon;
grant execute on function public.start_weekly_test() to authenticated;

-- Everything the weekly-test page needs: this week (deadline, participants, ranking, my result) and last week's top 3.
create or replace function public.weekly_test_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); wk date := bd_week_start(now()); res jsonb;
begin
  -- close attempts whose time ran out without a submit, so they are counted
  perform finalize_attempt(t.id) from test_attempts t
  where t.mode = 'weekly' and t.status = 'in_progress' and t.expires_at < now() and t.week_start >= wk - 7;

  with board as (
    select t.user_id, t.week_start, t.score, t.max_score, t.correct, t.id,
           greatest(1, round(extract(epoch from (t.submitted_at - t.started_at)) / 60))::int as mins,
           row_number() over (partition by t.week_start order by t.score desc, t.submitted_at - t.started_at, t.submitted_at) as rk
    from (select distinct on (user_id, week_start) * from test_attempts
          where mode = 'weekly' and status = 'submitted' and week_start in (wk, wk - 7)
          order by user_id, week_start, started_at) t),
  named as (
    select b.*, coalesce(nullif(trim(split_part(p.full_name, ' ', 1) ||
             case when split_part(p.full_name, ' ', 2) <> '' then ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.' else '' end), ''), 'সদস্য') as name
    from board b left join profiles p on p.id = b.user_id)
  select jsonb_build_object(
    'week_start', wk, 'week_end', ((wk + 7)::timestamp at time zone 'Asia/Dhaka'),
    'questions', 50, 'minutes', 40, 'negative', 0.5,
    'participants', (select count(*) from board where week_start = wk),
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'score', score, 'max', max_score, 'mins', mins, 'me', user_id = uid) order by rk)
                     from named where week_start = wk and rk <= 20), '[]'::jsonb),
    'last_week', jsonb_build_object(
       'participants', (select count(*) from board where week_start = wk - 7),
       'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'score', score, 'max', max_score, 'mins', mins) order by rk)
                        from named where week_start = wk - 7 and rk <= 3), '[]'::jsonb)),
    'me', case when uid is null then null else (
       select jsonb_build_object('id', t.id, 'status', t.status, 'score', t.score, 'max', t.max_score,
                                 'rank', (select rk from board where user_id = uid and week_start = wk))
       from test_attempts t where t.user_id = uid and t.mode = 'weekly' and t.week_start = wk order by t.started_at limit 1) end
  ) into res;
  return res;
end $$;
revoke all on function public.weekly_test_status() from public;
grant execute on function public.weekly_test_status() to anon, authenticated;
