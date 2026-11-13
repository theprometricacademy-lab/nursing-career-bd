-- Email recipients for one notification (service role only): confirmed emails of members who have not opted out.
create or replace function public.notify_recipients(p_only uuid default null)
returns table (email text, full_name text, token uuid)
language sql stable security definer set search_path = public, auth as $$
  select u.email::text, p.full_name, p.notify_token
  from profiles p join auth.users u on u.id = p.id
  where p.notify_email and u.email is not null and u.email not like '%@phone.%' and u.email_confirmed_at is not null
    and p.role <> 'hospital' and (p_only is null or p.id = p_only)
$$;
revoke all on function public.notify_recipients(uuid) from public, anon, authenticated;
grant execute on function public.notify_recipients(uuid) to service_role;
