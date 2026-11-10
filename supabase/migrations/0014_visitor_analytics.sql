-- First-party visitor analytics: page views with heartbeat, read only by admins.
create table if not exists public.page_views (
  id bigserial primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  path text not null,
  referrer text,
  device text,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists page_views_last_seen_idx on public.page_views (last_seen desc);
create index if not exists page_views_session_idx on public.page_views (session_id, started_at);
create index if not exists page_views_started_idx on public.page_views (started_at desc);
create index if not exists page_views_user_idx on public.page_views (user_id);
alter table public.page_views enable row level security;  -- no policies: only the functions below touch it

create or replace function public.track_view(p_visitor uuid, p_session uuid, p_path text, p_ref text default null, p_device text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare vid bigint;
begin
  if p_visitor is null or p_session is null or p_path is null then return null; end if;
  if (select count(*) from public.page_views where session_id = p_session and started_at > now() - interval '1 hour') >= 400 then return null; end if;
  insert into public.page_views (visitor_id, session_id, user_id, path, referrer, device)
  values (p_visitor, p_session, auth.uid(), left(p_path, 300), nullif(left(coalesce(p_ref, ''), 300), ''), left(p_device, 40))
  returning id into vid;
  return vid;
end $$;

create or replace function public.track_ping(p_id bigint, p_session uuid)
returns void language sql security definer set search_path = public as $$
  update public.page_views set last_seen = now()
  where id = p_id and session_id = p_session and last_seen > now() - interval '30 minutes';
$$;

revoke all on function public.track_view(uuid, uuid, text, text, text) from public;
revoke all on function public.track_ping(bigint, uuid) from public;
grant execute on function public.track_view(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.track_ping(bigint, uuid) to anon, authenticated;

create or replace function public.admin_visitors(p_tz text default 'Asia/Dhaka')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz; res jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with s as (
    select pv.session_id, min(pv.visitor_id::text) visitor_id, max(pv.user_id::text)::uuid user_id,
           min(pv.started_at) started, max(pv.last_seen) last_seen, count(*) views,
           (array_agg(pv.path order by pv.started_at desc))[1] current_path,
           (array_agg(pv.referrer order by pv.started_at) filter (where pv.referrer is not null))[1] referrer,
           min(pv.device) device
    from public.page_views pv where pv.last_seen > now() - interval '24 hours' group by pv.session_id
  ), src as (
    select session_id, (array_agg(referrer order by started_at) filter (where referrer is not null))[1] r
    from public.page_views where started_at >= now() - interval '7 days' group by session_id
  )
  select jsonb_build_object(
    'online', (select count(distinct visitor_id) from s where last_seen > now() - interval '2 minutes'),
    'today_visitors', (select count(distinct visitor_id) from public.page_views where started_at >= day_start),
    'today_views', (select count(*) from public.page_views where started_at >= day_start),
    'today_avg_seconds', (select coalesce(round(avg(extract(epoch from (l - f)))), 0) from (
        select min(started_at) f, max(last_seen) l from public.page_views where started_at >= day_start group by session_id) x),
    'week_visitors', (select count(distinct visitor_id) from public.page_views where started_at >= now() - interval '7 days'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'session_id', s.session_id, 'visitor', left(s.visitor_id, 6), 'name', p.full_name, 'email', u.email,
        'started', s.started, 'last_seen', s.last_seen, 'views', s.views, 'current_path', s.current_path,
        'referrer', s.referrer, 'device', s.device,
        'online', s.last_seen > now() - interval '2 minutes') order by s.last_seen desc)
      from (select * from s order by last_seen desc limit 100) s
      left join public.profiles p on p.id = s.user_id left join auth.users u on u.id = s.user_id), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(t) from (select path, count(*) views, round(avg(extract(epoch from (last_seen - started_at)))) avg_s
        from public.page_views where started_at >= day_start group by path order by count(*) desc limit 10) t), '[]'::jsonb),
    'top_sources', coalesce((select jsonb_agg(t) from (select coalesce(r, 'সরাসরি / অজানা') source, count(*) sessions
        from src group by 1 order by 2 desc limit 8) t), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function public.admin_session_views(p_session uuid)
returns table (path text, started_at timestamptz, seconds int) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select pv.path, pv.started_at, greatest(0, extract(epoch from (pv.last_seen - pv.started_at)))::int
    from public.page_views pv where pv.session_id = p_session order by pv.started_at;
end $$;
revoke all on function public.admin_visitors(text) from public;
revoke all on function public.admin_session_views(uuid) from public;
grant execute on function public.admin_visitors(text) to authenticated;
grant execute on function public.admin_session_views(uuid) to authenticated;
