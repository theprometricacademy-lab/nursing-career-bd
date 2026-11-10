-- Premium model-test series ordering + weekly leaderboard (week = Saturday–Friday, Bangladesh time).
alter table public.mock_tests add column if not exists sort_order int not null default 500;

create or replace function public.weekly_leaderboard(p_weeks_ago int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  loc timestamp := now() at time zone 'Asia/Dhaka';
  start_local timestamp := date_trunc('day', loc) - make_interval(days => ((extract(dow from loc)::int + 1) % 7) + 7 * greatest(p_weeks_ago, 0));
  ws timestamptz := start_local at time zone 'Asia/Dhaka';
  we timestamptz := (start_local + interval '7 days') at time zone 'Asia/Dhaka';
  uid uuid := auth.uid(); res jsonb;
begin
  with att as (
    select a.user_id, a.score, a.max_score, a.submitted_at,
           round(100.0 * greatest(a.score, 0) / nullif(a.max_score, 0), 1) pct
    from public.test_attempts a join public.mock_tests t on t.id = a.mock_test_id
    where a.status = 'submitted' and t.blueprint is not null and a.submitted_at >= ws and a.submitted_at < we and a.max_score > 0
  ), best as (
    select distinct on (user_id) user_id, pct, score, max_score, submitted_at,
           count(*) over (partition by user_id) tests
    from att order by user_id, pct desc, submitted_at asc
  ), ranked as (
    select b.*, rank() over (order by pct desc, submitted_at asc) rk from best b
  )
  select jsonb_build_object(
    'week_start', ws, 'week_end', we, 'participants', (select count(*) from ranked),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', r.rk, 'pct', r.pct, 'score', r.score, 'max', r.max_score, 'tests', r.tests, 'me', r.user_id = uid,
        'name', coalesce(nullif(trim(split_part(p.full_name, ' ', 1) ||
                 case when split_part(p.full_name, ' ', 2) <> '' then ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.' else '' end), ''), 'সদস্য'))
        order by r.rk)
      from (select * from ranked order by rk limit 20) r left join public.profiles p on p.id = r.user_id), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rk, 'pct', pct, 'tests', tests) from ranked where user_id = uid)
  ) into res;
  return res;
end $$;
revoke all on function public.weekly_leaderboard(int) from public;
grant execute on function public.weekly_leaderboard(int) to anon, authenticated;
