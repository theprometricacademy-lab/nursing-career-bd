-- Hospital accounts must sign in with a real e-mail (verified by Supabase sign-up confirmation or Google),
-- not a mobile-number account: it gives a recoverable login and a written contact channel.
-- Gmail is accepted (most clinics use it); an official domain e-mail is flagged for the admin as stronger proof.
create or replace function public.is_free_mail(p_email text)
returns boolean language sql immutable set search_path = public as $$
  select lower(split_part(coalesce(p_email, ''), '@', 2)) in ('gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
    'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'mail.com', 'gmx.com', 'yandex.com', 'zoho.com')
$$;

create or replace function public.hospital_login_ok()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users u where u.id = auth.uid() and u.email is not null
                 and u.email not ilike '%@phone.nursingjob.online' and (u.email_confirmed_at is not null))
$$;
revoke all on function public.hospital_login_ok() from public, anon;
grant execute on function public.hospital_login_ok() to authenticated;

-- wrap the existing registration with the e-mail rule
alter function public.register_hospital(jsonb) rename to register_hospital_core;
revoke all on function public.register_hospital_core(jsonb) from public, anon, authenticated;
create or replace function public.register_hospital(p jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not hospital_login_ok() and not exists (select 1 from hospitals where owner_id = auth.uid()) then
    raise exception 'email_required';
  end if;
  return register_hospital_core(p);
end $$;
revoke all on function public.register_hospital(jsonb) from public, anon;
grant execute on function public.register_hospital(jsonb) to authenticated;

create or replace function public.admin_hospital_accounts()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb) from (
    select h.id, h.name, h.status, h.district, h.phone, h.created_at, u.email as login, u.last_sign_in_at, p.full_name as owner_name, p.phone as owner_phone,
           u.email_confirmed_at is not null as email_verified, not public.is_free_mail(u.email) as official_email,
           (select count(*) from jobs j where j.hospital_id = h.id) as jobs,
           (select count(*) from jobs j where j.hospital_id = h.id and j.status = 'published') as live_jobs,
           (select count(*) from job_applications a where a.hospital_id = h.id) as applications
    from hospitals h join auth.users u on u.id = h.owner_id left join profiles p on p.id = h.owner_id) t);
end $$;
