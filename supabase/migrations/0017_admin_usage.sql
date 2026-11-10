-- Free-plan usage meter for the admin dashboard (rough estimates; exact numbers live in each provider's dashboard)
create or replace function public.admin_usage()
returns jsonb language plpgsql stable security definer set search_path = public, auth, storage as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
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
    'mau', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days')
  );
end $$;
revoke all on function public.admin_usage() from public;
grant execute on function public.admin_usage() to authenticated;
