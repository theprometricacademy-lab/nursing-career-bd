-- Android app: count downloads of the APK from the home page, and show admins how many people use the app.
-- App visits are recognised by the device label the tracker adds ("… · অ্যাপ") when the site runs inside the app.
create table if not exists public.app_downloads (
  id bigserial primary key,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists app_downloads_created_idx on public.app_downloads (created_at desc);
alter table public.app_downloads enable row level security;  -- no policies: only the functions below touch it

create or replace function public.track_app_download(p_visitor uuid, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null then return; end if;
  -- ignore repeated taps from the same browser
  if exists (select 1 from public.app_downloads where visitor_id = p_visitor and created_at > now() - interval '10 minutes') then return; end if;
  insert into public.app_downloads (visitor_id, user_id, device) values (p_visitor, auth.uid(), left(p_device, 40));
end $$;
revoke all on function public.track_app_download(uuid, text) from public;
grant execute on function public.track_app_download(uuid, text) to anon, authenticated;

create or replace function public.admin_app_stats(p_tz text default 'Asia/Dhaka')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'downloads_total', (select count(*) from public.app_downloads),
    'downloads_people', (select count(distinct visitor_id) from public.app_downloads),
    'downloads_today', (select count(*) from public.app_downloads where created_at >= day_start),
    'downloads_7d', (select count(*) from public.app_downloads where created_at >= now() - interval '7 days'),
    'app_online', (select count(distinct visitor_id) from public.page_views
                   where device like '%অ্যাপ%' and last_seen > now() - interval '2 minutes'),
    'app_today', (select count(distinct visitor_id) from public.page_views where device like '%অ্যাপ%' and started_at >= day_start),
    'app_7d', (select count(distinct visitor_id) from public.page_views where device like '%অ্যাপ%' and started_at >= now() - interval '7 days'),
    'app_total', (select count(distinct visitor_id) from public.page_views where device like '%অ্যাপ%'),
    'app_members', (select count(distinct user_id) from public.page_views where device like '%অ্যাপ%' and user_id is not null)
  );
end $$;
revoke all on function public.admin_app_stats(text) from public;
grant execute on function public.admin_app_stats(text) to authenticated;
