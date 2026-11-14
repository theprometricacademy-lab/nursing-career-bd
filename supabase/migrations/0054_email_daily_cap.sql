-- Email sending fits the free email plan (100 a day): notification emails wait in a queue and at most
-- `daily_cap` (default 80) go out per UTC day, the rest on the following mornings. The remaining 20 stay free for
-- password-reset emails. The Saturday weekly-test email can be switched off (bell + push still go).

insert into public.app_settings (key, value, is_public)
values ('notify_email', '{"weekly": false, "daily_cap": 80}'::jsonb, false)
on conflict (key) do nothing;

create table if not exists public.email_queue (
  id bigserial primary key,
  notification_id bigint not null references public.notifications(id) on delete cascade,
  email text not null,
  full_name text,
  token uuid,
  priority int not null default 0,              -- 1 = a test sent to one person, goes first
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (notification_id, email)
);
create index if not exists email_queue_pending_idx on public.email_queue (priority desc, created_at, id) where status = 'pending';
create index if not exists email_queue_sent_idx on public.email_queue (sent_at) where status = 'sent';
alter table public.email_queue enable row level security;
revoke all on public.email_queue from anon, authenticated;

-- put every recipient of one notification in the queue
create or replace function public.email_queue_add(p_notification bigint) returns int
language plpgsql security definer set search_path = public as $$
declare n public.notifications; c int;
begin
  select * into n from public.notifications where id = p_notification;
  if not found or not n.send_email then return 0; end if;
  insert into public.email_queue (notification_id, email, full_name, token, priority)
  select n.id, r.email, r.full_name, r.token, case when n.only_user is null then 0 else 1 end
  from public.notify_recipients(n.only_user) r
  on conflict (notification_id, email) do nothing;
  get diagnostics c = row_count;
  return c;
end $$;

-- hand out the next emails to send, never more than today's remaining allowance (and at most 100 per call)
create or replace function public.email_queue_claim()
returns table (qid bigint, to_email text, to_name text, to_token uuid, n_title text, n_body text, n_url text)
language plpgsql security definer set search_path = public as $$
declare cap int := coalesce((select (s.value->>'daily_cap')::int from public.app_settings s where s.key = 'notify_email'), 80);
        day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
        used int; room int;
begin
  update public.email_queue q set status = 'expired' where q.status = 'pending' and q.created_at < now() - interval '6 days';
  update public.email_queue q set status = 'pending' where q.status = 'sending' and q.claimed_at < now() - interval '15 minutes';
  select (select count(*) from public.email_queue q where q.status in ('sent', 'sending') and coalesce(q.sent_at, q.claimed_at) >= day_start)
       + (select coalesce(sum(n.email_sent), 0) from public.notifications n
          where n.created_at >= day_start and not exists (select 1 from public.email_queue q where q.notification_id = n.id))
    into used;
  room := least(greatest(cap - used, 0), 100);
  if room = 0 then return; end if;
  return query
  with c as (
    select q.id from public.email_queue q where q.status = 'pending'
    order by q.priority desc, q.created_at, q.id limit room for update skip locked
  ), u as (
    update public.email_queue q set status = 'sending', claimed_at = now() from c where q.id = c.id
    returning q.id, q.notification_id, q.email, q.full_name, q.token
  )
  select u.id, u.email, u.full_name, u.token, n.title, n.body, n.url from u join public.notifications n on n.id = u.notification_id;
end $$;

-- record the result of one batch and keep the notification's sent count right
create or replace function public.email_queue_done(p_ids bigint[], p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ok then
    update public.email_queue q set status = 'sent', sent_at = now() where q.id = any(p_ids) and q.status = 'sending';
  else
    update public.email_queue q set attempts = q.attempts + 1, status = case when q.attempts + 1 >= 3 then 'failed' else 'pending' end
    where q.id = any(p_ids) and q.status = 'sending';
  end if;
  update public.notifications n
  set email_sent = (select count(*) from public.email_queue q where q.notification_id = n.id and q.status = 'sent')
  where n.id in (select distinct q.notification_id from public.email_queue q where q.id = any(p_ids));
end $$;

revoke all on function public.email_queue_add(bigint) from public, anon, authenticated;
revoke all on function public.email_queue_claim() from public, anon, authenticated;
revoke all on function public.email_queue_done(bigint[], boolean) from public, anon, authenticated;
grant execute on function public.email_queue_add(bigint) to service_role;
grant execute on function public.email_queue_claim() to service_role;
grant execute on function public.email_queue_done(bigint[], boolean) to service_role;

-- every morning (06:15 Dhaka, just after the daily allowance resets) send the emails still waiting
create or replace function public.drain_email_queue() returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not exists (select 1 from public.email_queue where status = 'pending') then return; end if;
  select * into c from public.notify_config where id = 1;
  if c.fn_url is null then return; end if;
  perform net.http_post(url := c.fn_url, body := jsonb_build_object('drain', true),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', c.secret),
    timeout_milliseconds := 60000);
end $$;
revoke all on function public.drain_email_queue() from public, anon, authenticated;
select cron.schedule('email-queue-drain', '15 0 * * *', 'select public.drain_email_queue()');

-- Saturday announcement: the email part follows the setting (bell + push always go)
create or replace function public.weekly_notify() returns void
language plpgsql security definer set search_path = public as $$
declare n int; t text;
        mail boolean := coalesce((select (s.value->>'weekly')::boolean from public.app_settings s where s.key = 'notify_email'), true);
begin
  select count(*) into n from weekly_board(bd_week_start(now()) - 7);
  t := case when n > 0 then 'গত সপ্তাহে অংশ নিয়েছেন ' || n || ' জন। ' else '' end;
  insert into notifications (kind, title, body, url, send_email, send_push)
  values ('weekly', 'এই সপ্তাহের ফ্রি মডেল টেস্ট এসেছে 📝',
          t || '৫০টি প্রশ্ন · ৪০ মিনিট · শুক্রবার রাত ১২টা পর্যন্ত যেকোনো সময় দিন। শেষে দেখুন সবার মধ্যে আপনার অবস্থান।',
          '/weekly-test', mail, true);
end $$;
revoke all on function public.weekly_notify() from public, anon, authenticated;

-- admin log: emails still waiting, today's use and the settings
create or replace function public.admin_notification_log() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select n.id, n.kind, n.title, n.url, n.send_email, n.send_push, n.only_user is not null as test, n.status, n.email_sent, n.push_sent, n.created_at,
             (select count(*) from email_queue q where q.notification_id = n.id and q.status in ('pending', 'sending')) as email_queued
      from notifications n order by n.created_at desc limit 30) x), '[]'::jsonb),
    'push_devices', (select count(*) from push_subscriptions),
    'push_members', (select count(distinct user_id) from push_subscriptions),
    'email_members', (select count(*) from profiles p join auth.users u on u.id = p.id where p.notify_email and u.email is not null and u.email not like '%@phone.%'),
    'email_off', (select count(*) from profiles where not notify_email),
    'email_today', (select count(*) from email_queue q where q.status = 'sent' and q.sent_at >= day_start)
                 + (select coalesce(sum(n.email_sent), 0) from notifications n
                    where n.created_at >= day_start and not exists (select 1 from email_queue q where q.notification_id = n.id)),
    'email_waiting', (select count(*) from email_queue q where q.status in ('pending', 'sending')),
    'email_cap', coalesce((select (s.value->>'daily_cap')::int from app_settings s where s.key = 'notify_email'), 80),
    'weekly_email', coalesce((select (s.value->>'weekly')::boolean from app_settings s where s.key = 'notify_email'), true));
end $$;
