-- The admin "server usage" card shows Resend's own numbers (emails used today / this month), not a guess
-- from sign-ups. The notify function asks Resend (GET /usage, needs a full-access key in RESEND_USAGE_KEY) and keeps the
-- answer in app_settings.resend_usage; without that key the card shows the emails this site itself sent today.

insert into public.app_settings (key, value, is_public)
values ('resend_usage', '{}'::jsonb, false)
on conflict (key) do nothing;

create or replace function public.refresh_resend_usage() returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from public.notify_config where id = 1;
  if c.fn_url is null then return; end if;
  perform net.http_post(url := c.fn_url, body := jsonb_build_object('usage', true),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', c.secret),
    timeout_milliseconds := 20000);
end $$;
revoke all on function public.refresh_resend_usage() from public, anon, authenticated;

-- called when the admin opens the page, so the numbers are fresh
create or replace function public.admin_refresh_resend_usage() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  perform public.refresh_resend_usage();
end $$;
revoke all on function public.admin_refresh_resend_usage() from public, anon;
grant execute on function public.admin_refresh_resend_usage() to authenticated;

select cron.schedule('resend-usage-refresh', '5 * * * *', 'select public.refresh_resend_usage()');

create or replace function public.admin_usage() returns jsonb
language plpgsql stable security definer set search_path = public, auth, storage as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
        utc_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';   -- Resend's day
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'views_today', (select count(*) from public.page_views where started_at >= day_start),
    'visitors_today', (select count(distinct visitor_id) from public.page_views where started_at >= day_start),
    'max_views_day_7d', coalesce((select max(n) from (select count(*) n from public.page_views where started_at > now() - interval '7 days'
                          group by date_trunc('day', started_at at time zone 'Asia/Dhaka')) x), 0),
    'email_signups_today', (select count(*) from auth.users where created_at >= day_start
                          and email not like '%@phone.nursingjob.online'
                          and not exists (select 1 from auth.identities i where i.user_id = users.id and i.provider = 'google')),
    'mau', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'resend', coalesce((select s.value from public.app_settings s where s.key = 'resend_usage'), '{}'::jsonb),
    -- emails this site itself sent today (Resend's day): notifications + password-reset / confirmation mails.
    -- Used when Resend's own number cannot be read (the sending key is not allowed to read usage).
    'email_today', (select count(*) from public.email_queue q where q.status = 'sent' and q.sent_at >= utc_day)
                 + (select coalesce(sum(n.email_sent), 0) from public.notifications n
                    where n.created_at >= utc_day and not exists (select 1 from public.email_queue q where q.notification_id = n.id))
                 + (select count(*) filter (where recovery_sent_at >= utc_day) + count(*) filter (where confirmation_sent_at >= utc_day)
                         + count(*) filter (where email_change_sent_at >= utc_day) from auth.users)
  );
end $$;
