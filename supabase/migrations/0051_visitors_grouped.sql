-- Live visitors: one row per person (browser), not one row per tab visit.
-- A visitor who opens the same page in many tabs (or saves it in the background) used to fill the list.

create or replace function public.admin_visitors(p_tz text default 'Asia/Dhaka')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz; res jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with v as (
    select pv.visitor_id, max(pv.user_id::text)::uuid user_id,
           min(pv.started_at) started, max(pv.last_seen) last_seen, count(*) views,
           count(distinct pv.session_id) visits,
           coalesce(round(sum(extract(epoch from (pv.last_seen - pv.started_at)))), 0) seconds,
           (array_agg(pv.path order by pv.last_seen desc, pv.started_at desc))[1] current_path,
           (array_agg(pv.session_id order by pv.last_seen desc, pv.started_at desc))[1] session_id,
           (array_agg(pv.referrer order by pv.started_at) filter (where pv.referrer is not null))[1] referrer,
           min(pv.device) device
    from public.page_views pv where pv.last_seen > now() - interval '24 hours' group by pv.visitor_id
  ), src as (
    select session_id, (array_agg(referrer order by started_at) filter (where referrer is not null))[1] r
    from public.page_views where started_at >= now() - interval '7 days' group by session_id
  )
  select jsonb_build_object(
    'online', (select count(*) from v where last_seen > now() - interval '2 minutes'),
    'today_visitors', (select count(distinct visitor_id) from public.page_views where started_at >= day_start),
    'today_views', (select count(*) from public.page_views where started_at >= day_start),
    'today_avg_seconds', (select coalesce(round(avg(extract(epoch from (l - f)))), 0) from (
        select min(started_at) f, max(last_seen) l from public.page_views where started_at >= day_start group by session_id) x),
    'week_visitors', (select count(distinct visitor_id) from public.page_views where started_at >= now() - interval '7 days'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'session_id', v.session_id, 'visitor_id', v.visitor_id, 'visitor', left(v.visitor_id::text, 6), 'name', p.full_name, 'email', u.email,
        'started', v.started, 'last_seen', v.last_seen, 'views', v.views, 'visits', v.visits, 'seconds', v.seconds,
        'current_path', v.current_path, 'referrer', v.referrer, 'device', v.device,
        'online', v.last_seen > now() - interval '2 minutes') order by v.last_seen desc)
      from (select * from v order by last_seen desc limit 100) v
      left join public.profiles p on p.id = v.user_id left join auth.users u on u.id = v.user_id), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(t) from (select path, count(*) views, round(avg(extract(epoch from (last_seen - started_at)))) avg_s
        from public.page_views where started_at >= day_start group by path order by count(*) desc limit 10) t), '[]'::jsonb),
    'top_sources', coalesce((select jsonb_agg(t) from (select coalesce(r, 'সরাসরি / অজানা') source, count(*) sessions
        from src group by 1 order by 2 desc limit 8) t), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Everything one visitor did in the last 24 hours, across all their tab visits.
create or replace function public.admin_visitor_views(p_visitor uuid)
returns table(path text, started_at timestamptz, seconds int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select pv.path, pv.started_at, greatest(0, extract(epoch from (pv.last_seen - pv.started_at)))::int
    from public.page_views pv
    where pv.visitor_id = p_visitor and pv.last_seen > now() - interval '24 hours'
    order by pv.started_at limit 500;
end $$;

revoke all on function public.admin_visitor_views(uuid) from public, anon;
grant execute on function public.admin_visitor_views(uuid) to authenticated;
