-- Trust & safety for private-hospital job posts
--  * hospitals must give their DGHS licence number (and may attach the licence copy); only the admin can read it —
--    not even the hospital account can read it back;
--  * hospitals accept the posting rules (no money from applicants, true information);
--  * anyone signed in can report a post; three separate reports take it offline until the admin reviews it.

create table if not exists public.hospital_verifications (
  hospital_id bigint primary key references public.hospitals(id) on delete cascade,
  license_no text not null,
  trade_license text,
  license_doc text,
  terms_accepted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.hospital_verifications enable row level security;
drop policy if exists hv_admin on public.hospital_verifications;
create policy hv_admin on public.hospital_verifications for select to authenticated using ((select public.is_admin()));
revoke all on public.hospital_verifications from anon;
revoke insert, update, delete, truncate on public.hospital_verifications from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hospital-docs', 'hospital-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
drop policy if exists hdoc_insert on storage.objects;
create policy hdoc_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hospital-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists hdoc_admin on storage.objects;
create policy hdoc_admin on storage.objects for select to authenticated
  using (bucket_id = 'hospital-docs' and (select public.is_admin()));

-- the hospital can see THAT a licence is on file (to show "জমা আছে"), never the number itself
create or replace function public.my_hospital_license_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('has_license', v.hospital_id is not null, 'has_doc', v.license_doc is not null, 'terms', v.terms_accepted_at is not null)
  from hospitals h left join hospital_verifications v on v.hospital_id = h.id where h.owner_id = auth.uid()
$$;

create or replace function public.register_hospital(p jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); h hospitals; v hospital_verifications; nm text := clean_text(p->>'name', 150); hid bigint;
        lic text := clean_text(p->>'license_no', 60); doc text := clean_text(p->>'license_doc', 300); recheck boolean := false;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not rate_ok('register_hospital', 20, interval '1 day') then raise exception 'rate_limited'; end if;
  if nm is null or char_length(nm) < 3 then raise exception 'name_required'; end if;
  if clean_text(p->>'phone', 30) is null then raise exception 'phone_required'; end if;
  if doc is not null and split_part(doc, '/', 1) <> uid::text then raise exception 'bad_file'; end if;
  select * into h from hospitals where owner_id = uid;
  if found then select * into v from hospital_verifications where hospital_id = h.id; end if;
  -- a licence number is required the first time; afterwards an empty field keeps the one on file
  if lic is null and v.hospital_id is null then raise exception 'license_required'; end if;
  if lic is not null and char_length(lic) < 3 then raise exception 'license_required'; end if;
  if v.terms_accepted_at is null and coalesce((p->>'terms')::boolean, false) is not true then raise exception 'terms_required'; end if;

  if h.id is not null then
    if h.status = 'suspended' then raise exception 'suspended'; end if;
    recheck := h.status = 'approved' and (h.name is distinct from nm or (lic is not null and lic is distinct from v.license_no));
    update hospitals set name = nm, district = clean_text(p->>'district', 60), address = clean_text(p->>'address', 300),
      phone = clean_text(p->>'phone', 30), email = clean_text(p->>'email', 120), website = clean_url(p->>'website'),
      contact_person = clean_text(p->>'contact_person', 100), about = clean_text(p->>'about', 1000),
      status = case when recheck then 'pending' else h.status end, updated_at = now()
    where id = h.id returning id into hid;
  else
    insert into hospitals (owner_id, name, district, address, phone, email, website, contact_person, about)
    values (uid, nm, clean_text(p->>'district', 60), clean_text(p->>'address', 300), clean_text(p->>'phone', 30),
            clean_text(p->>'email', 120), clean_url(p->>'website'), clean_text(p->>'contact_person', 100), clean_text(p->>'about', 1000))
    returning id into hid;
  end if;

  if v.hospital_id is null then
    insert into hospital_verifications (hospital_id, license_no, trade_license, license_doc, terms_accepted_at)
    values (hid, lic, clean_text(p->>'trade_license', 60), doc, now());
  else
    update hospital_verifications set license_no = coalesce(lic, license_no),
      trade_license = coalesce(clean_text(p->>'trade_license', 60), trade_license),
      license_doc = coalesce(doc, license_doc), terms_accepted_at = coalesce(terms_accepted_at, now()), updated_at = now()
    where hospital_id = hid;
  end if;
  return hid;
end $$;

-- ---------- reports ----------
create table if not exists public.job_reports (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('money', 'fake', 'wrong_info', 'closed', 'other')),
  note text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (job_id, user_id)
);
alter table public.job_reports enable row level security;
drop policy if exists jr_admin on public.job_reports;
create policy jr_admin on public.job_reports for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.job_reports from anon;

create or replace function public.report_job(p_job bigint, p_reason text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_reason not in ('money', 'fake', 'wrong_info', 'closed', 'other') then raise exception 'bad_reason'; end if;
  if not rate_ok('report_job', 20, interval '1 day') then raise exception 'rate_limited'; end if;
  if not exists (select 1 from jobs where id = p_job and status = 'published') then raise exception 'not_found'; end if;
  insert into job_reports (job_id, user_id, reason, note) values (p_job, uid, p_reason, clean_text(p_note, 500))
  on conflict (job_id, user_id) do nothing;
  select count(*) into n from job_reports where job_id = p_job and not resolved;
  if n >= 3 then
    update jobs set status = 'pending', admin_note = 'একাধিক রিপোর্টের কারণে যাচাইয়ের জন্য সাময়িক বন্ধ' where id = p_job and status = 'published';
  end if;
end $$;

do $$ declare f text; begin
  foreach f in array array['register_hospital(jsonb)', 'my_hospital_license_status()', 'report_job(bigint,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
