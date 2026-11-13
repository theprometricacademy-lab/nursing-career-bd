-- Member notifications: in-site bell, phone (web push) and email.
--  * notifications: one row per announcement; inserting a row asks the `notify` Edge Function to send it
--    (push to subscribed devices, and email when send_email = true) via pg_net.
--  * New published government circulars and the Saturday weekly test create rows automatically.
--  * Members choose: profiles.notify_email (email on/off, one-click unsubscribe by token), push per device.
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.profiles add column if not exists notify_email boolean not null default true;
alter table public.profiles add column if not exists notif_seen_at timestamptz;
alter table public.profiles add column if not exists notify_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_notify_token_key on public.profiles(notify_token);
grant update (notify_email, notif_seen_at) on public.profiles to authenticated;

create table if not exists public.notifications (
  id bigserial primary key,
  kind text not null default 'info' check (kind in ('weekly', 'circular', 'info')),
  title text not null check (length(title) between 3 and 140),
  body text check (length(body) <= 600),
  url text check (url is null or url ~ '^/' or url ~ '^https://'),
  send_email boolean not null default false,
  send_push boolean not null default true,
  only_user uuid references auth.users(id) on delete cascade,   -- test sends: one member only
  status text not null default 'pending',
  email_sent int not null default 0,
  push_sent int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (only_user is null or only_user = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://'),
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- private settings for the sender (function URL, shared secret, push keys); no API role can read it
create table if not exists public.notify_config (id int primary key default 1 check (id = 1), fn_url text, secret text, vapid_public text, vapid_private text);
alter table public.notify_config enable row level security;
revoke all on public.notify_config from anon, authenticated;

create or replace function public.fire_notification(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from notify_config where id = 1;
  if c.fn_url is null then return; end if;
  perform net.http_post(url := c.fn_url, body := jsonb_build_object('id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', c.secret),
    timeout_milliseconds := 60000);
end $$;
revoke all on function public.fire_notification(bigint) from public, anon, authenticated;

create or replace function public.notifications_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.send_push or new.send_email then perform fire_notification(new.id); end if;
  return new;
end $$;
drop trigger if exists notifications_fire on public.notifications;
create trigger notifications_fire after insert on public.notifications for each row execute function public.notifications_after_insert();

-- a newly published government circular → bell + push + email
create or replace function public.circular_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not coalesce(old.is_published, false))
     and (new.apply_end is null or new.apply_end > now()) then
    insert into notifications (kind, title, body, url, send_email, send_push)
    values ('circular', left('নতুন সার্কুলার: ' || new.title_bn, 140),
            left(concat_ws(' · ', new.org_bn,
                 case when new.total_posts is not null then new.total_posts || 'টি পদ' end,
                 case when new.apply_end is not null then 'আবেদনের শেষ দিন ' || to_char(new.apply_end at time zone 'Asia/Dhaka', 'DD-MM-YYYY') end), 600),
            '/circulars/' || new.slug, true, true);
  end if;
  return new;
end $$;
drop trigger if exists circulars_notify on public.circulars;
create trigger circulars_notify after insert or update of is_published on public.circulars for each row execute function public.circular_notify();

-- Saturday 9:00 (Asia/Dhaka) announcement of the new free weekly test
create or replace function public.weekly_notify() returns void
language plpgsql security definer set search_path = public as $$
declare n int; t text;
begin
  select count(*) into n from weekly_board(bd_week_start(now()) - 7);
  t := case when n > 0 then 'গত সপ্তাহে অংশ নিয়েছেন ' || n || ' জন। ' else '' end;
  insert into notifications (kind, title, body, url, send_email, send_push)
  values ('weekly', 'এই সপ্তাহের ফ্রি মডেল টেস্ট এসেছে 📝',
          t || '৫০টি প্রশ্ন · ৪০ মিনিট · শুক্রবার রাত ১২টা পর্যন্ত যেকোনো সময় দিন। শেষে দেখুন সবার মধ্যে আপনার অবস্থান।',
          '/weekly-test', true, true);
end $$;
revoke all on function public.weekly_notify() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'weekly-test-notify';
select cron.schedule('weekly-test-notify', '0 3 * * 6', 'select public.weekly_notify()');

-- member side
create or replace function public.my_notifications() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); seen timestamptz; joined timestamptz;
begin
  if uid is null then return null; end if;
  select notif_seen_at, created_at into seen, joined from profiles where id = uid;
  return jsonb_build_object(
    'unread', (select count(*) from notifications where (only_user is null or only_user = uid) and created_at > greatest(coalesce(seen, '-infinity'), joined - interval '14 days')),
    'items', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select id, kind, title, body, url, created_at from notifications
        where (only_user is null or only_user = uid) and created_at > joined - interval '14 days'
        order by created_at desc limit 20) x), '[]'::jsonb),
    'email', (select notify_email from profiles where id = uid));
end $$;
revoke all on function public.my_notifications() from public, anon;
grant execute on function public.my_notifications() to authenticated;

create or replace function public.mark_notifications_seen() returns void
language sql security definer set search_path = public as $$ update profiles set notif_seen_at = now() where id = auth.uid() $$;
revoke all on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated;

create or replace function public.save_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then raise exception 'invalid'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke all on function public.save_push(text, text, text) from public, anon;
grant execute on function public.save_push(text, text, text) to authenticated;

create or replace function public.remove_push(p_endpoint text) returns void
language sql security definer set search_path = public as $$ delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;
revoke all on function public.remove_push(text) from public, anon;
grant execute on function public.remove_push(text) to authenticated;

-- one-click unsubscribe from the email footer (no login needed; token is per member and unguessable)
create or replace function public.unsubscribe_email(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update profiles set notify_email = false where notify_token = p_token;
  return found;
end $$;
revoke all on function public.unsubscribe_email(uuid) from public;
grant execute on function public.unsubscribe_email(uuid) to anon, authenticated;

-- admin
create or replace function public.admin_send_notification(p_title text, p_body text, p_url text, p_email boolean, p_push boolean, p_test boolean default false) returns bigint
language plpgsql security definer set search_path = public as $$
declare nid bigint;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into notifications (kind, title, body, url, send_email, send_push, only_user, created_by)
  values ('info', trim(p_title), nullif(trim(p_body), ''), nullif(trim(p_url), ''), p_email, p_push, case when p_test then auth.uid() end, auth.uid())
  returning id into nid;
  return nid;
end $$;
revoke all on function public.admin_send_notification(text, text, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_send_notification(text, text, text, boolean, boolean, boolean) to authenticated;

create or replace function public.admin_notification_log() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(x order by x.created_at desc) from (select id, kind, title, url, send_email, send_push, only_user is not null as test, status, email_sent, push_sent, created_at from notifications order by created_at desc limit 30) x), '[]'::jsonb),
    'push_devices', (select count(*) from push_subscriptions),
    'push_members', (select count(distinct user_id) from push_subscriptions),
    'email_members', (select count(*) from profiles p join auth.users u on u.id = p.id where p.notify_email and u.email is not null and u.email not like '%@phone.%'),
    'email_off', (select count(*) from profiles where not notify_email));
end $$;
revoke all on function public.admin_notification_log() from public, anon;
grant execute on function public.admin_notification_log() to authenticated;
