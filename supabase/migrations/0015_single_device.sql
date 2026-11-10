-- One account = one active device. The newest login wins; older devices are signed out
-- and lose premium access immediately (premium checks use the JWT's session_id).
create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  device_label text,
  claimed_at timestamptz not null default now()
);
alter table public.active_sessions enable row level security;  -- no policies: functions only

-- Allowed only if this is the newest login of the account (read-only; safe inside other checks)
create or replace function public.session_allowed()
returns boolean language plpgsql stable security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid; my_created timestamptz;
begin
  if uid is null or sid is null then return true; end if;
  if exists (select 1 from public.profiles where id = uid and role = 'admin') then return true; end if;
  select created_at into my_created from auth.sessions where id = sid and user_id = uid;
  if my_created is null then return false; end if;  -- this login was revoked
  return not exists (select 1 from auth.sessions where user_id = uid and id <> sid and created_at > my_created);
end $$;

-- Called by the app on every load/login: records this device and signs out OLDER devices only.
create or replace function public.claim_session(p_label text default null)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid; my_created timestamptz;
begin
  if uid is null or sid is null then return true; end if;
  if exists (select 1 from public.profiles where id = uid and role = 'admin') then return true; end if;
  if not public.session_allowed() then return false; end if;
  select created_at into my_created from auth.sessions where id = sid;
  insert into public.active_sessions (user_id, session_id, device_label, claimed_at)
  values (uid, sid, left(p_label, 60), now())
  on conflict (user_id) do update set session_id = excluded.session_id, device_label = excluded.device_label, claimed_at = now()
  where public.active_sessions.session_id is distinct from excluded.session_id;
  delete from auth.sessions where user_id = uid and id <> sid and created_at <= my_created;
  return true;
end $$;

revoke all on function public.session_allowed() from public;
revoke all on function public.claim_session(text) from public;
grant execute on function public.session_allowed() to authenticated;
grant execute on function public.claim_session(text) to authenticated;

-- Premium only on the active device (checks for other users, e.g. admin lists, are unaffected)
create or replace function public.has_premium(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and plan = 'lifetime' and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  ) and (p_user is distinct from auth.uid() or public.session_allowed());
$$;
