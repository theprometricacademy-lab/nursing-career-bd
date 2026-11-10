-- Keep admins out of visitor / page-view / app statistics.
-- A browser that has ever been used signed in as an admin is remembered in admin_devices,
-- so its visits are skipped even when the admin isn't signed in.
create table if not exists public.admin_devices (visitor_id uuid primary key, added_at timestamptz not null default now());
alter table public.admin_devices enable row level security;  -- no policies: only track_view uses it

insert into public.admin_devices (visitor_id)
select distinct pv.visitor_id from public.page_views pv
join public.profiles p on p.id = pv.user_id and p.role = 'admin'
on conflict do nothing;

-- Earlier admin visits move to an archive table (kept, not deleted) so they drop out of the numbers
create table if not exists public.page_views_admin_archive (like public.page_views including all);
alter table public.page_views_admin_archive enable row level security;
with moved as (
  delete from public.page_views pv
  where pv.visitor_id in (select visitor_id from public.admin_devices)
     or pv.user_id in (select id from public.profiles where role = 'admin')
  returning pv.*
)
insert into public.page_views_admin_archive select * from moved;

create or replace function public.track_view(p_visitor uuid, p_session uuid, p_path text, p_ref text default null, p_device text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare vid bigint;
begin
  if p_visitor is null or p_session is null or p_path is null then return null; end if;
  -- admins are not counted; remember this browser so it stays uncounted when signed out
  if public.is_admin() then
    insert into public.admin_devices (visitor_id) values (p_visitor) on conflict do nothing;
    return null;
  end if;
  if exists (select 1 from public.admin_devices where visitor_id = p_visitor) then return null; end if;
  -- simple abuse guard: at most 400 views per session per hour
  if (select count(*) from public.page_views where session_id = p_session and started_at > now() - interval '1 hour') >= 400 then return null; end if;
  insert into public.page_views (visitor_id, session_id, user_id, path, referrer, device)
  values (p_visitor, p_session, auth.uid(), left(p_path, 300), nullif(left(coalesce(p_ref, ''), 300), ''), left(p_device, 40))
  returning id into vid;
  return vid;
end $$;

-- app downloads tapped by admins don't count either
create or replace function public.track_app_download(p_visitor uuid, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or public.is_admin() then return; end if;
  if exists (select 1 from public.admin_devices where visitor_id = p_visitor) then return; end if;
  if exists (select 1 from public.app_downloads where visitor_id = p_visitor and created_at > now() - interval '10 minutes') then return; end if;
  insert into public.app_downloads (visitor_id, user_id, device) values (p_visitor, auth.uid(), left(p_device, 40));
end $$;
