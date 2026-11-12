-- Private hospital jobs: hospitals register and post nurse vacancies (published only after admin review),
-- the admin can also list vacancies found elsewhere (apply on the hospital's own link), and nurses keep one
-- CV here and apply in one tap. Security model:
--   * every write goes through a SECURITY DEFINER function that validates and caps input; tables have no
--     client insert/update policies (admins excepted);
--   * a hospital sees only the applications to its own vacancies, as a snapshot of the CV taken at apply time;
--   * CV files sit in a private bucket; a hospital can open one only through an application to its vacancy.

-- ---------- helpers ----------
create or replace function public.clean_text(p text, p_max int)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p, ''), '[\x01-\x08\x0B\x0C\x0E-\x1F]', '', 'g')), p_max), '')
$$;
create or replace function public.clean_url(p text)
returns text language sql immutable as $$
  select case when btrim(coalesce(p, '')) ~* '^https?://[^\s<>"''`]+$' and length(btrim(p)) <= 500 then btrim(p) end
$$;

-- ---------- tables ----------
create table if not exists public.hospitals (
  id bigint generated always as identity primary key,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 150),
  district text, address text, phone text, email text, website text, contact_person text, about text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  admin_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id bigint generated always as identity primary key,
  slug text unique,
  hospital_id bigint references public.hospitals(id) on delete cascade,
  hospital_name text not null check (char_length(hospital_name) between 2 and 150),
  district text, location text,
  post_title text not null check (char_length(post_title) between 2 and 150),
  vacancies int check (vacancies between 1 and 5000),
  salary text, job_type text, qualifications text, description text,
  deadline date,
  apply_mode text not null default 'external' check (apply_mode in ('site', 'external')),
  apply_url text, apply_info text, source_url text,
  status text not null default 'pending' check (status in ('pending', 'published', 'closed', 'rejected')),
  admin_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz
);
create index if not exists jobs_public_idx on public.jobs (status, deadline, published_at desc);
create index if not exists jobs_hospital_idx on public.jobs (hospital_id);

create table if not exists public.candidate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, phone text not null, email text, district text, address text,
  date_of_birth date, gender text,
  qualification text not null, institute text, passing_year int,
  bnmc_reg text, experience_years numeric(4,1), experience text, current_workplace text,
  skills text, about text, cv_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hospital_id bigint references public.hospitals(id) on delete cascade,
  profile jsonb not null,
  cv_path text,
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'viewed', 'shortlisted', 'rejected', 'hired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);
create index if not exists job_applications_hospital_idx on public.job_applications (hospital_id, job_id);

alter table public.hospitals enable row level security;
alter table public.jobs enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.job_applications enable row level security;

-- ---------- read policies ----------
drop policy if exists hospitals_own on public.hospitals;
create policy hospitals_own on public.hospitals for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists hospitals_admin on public.hospitals;
create policy hospitals_admin on public.hospitals for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists jobs_public on public.jobs;
create policy jobs_public on public.jobs for select to anon, authenticated using (status = 'published');
drop policy if exists jobs_own on public.jobs;
create policy jobs_own on public.jobs for select to authenticated
  using (hospital_id in (select h.id from public.hospitals h where h.owner_id = (select auth.uid())));
drop policy if exists jobs_admin on public.jobs;
create policy jobs_admin on public.jobs for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists cand_own on public.candidate_profiles;
create policy cand_own on public.candidate_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists cand_admin on public.candidate_profiles;
create policy cand_admin on public.candidate_profiles for select to authenticated using ((select public.is_admin()));

drop policy if exists apps_own on public.job_applications;
create policy apps_own on public.job_applications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists apps_hospital on public.job_applications;
create policy apps_hospital on public.job_applications for select to authenticated
  using (hospital_id in (select h.id from public.hospitals h where h.owner_id = (select auth.uid()) and h.status = 'approved'));
drop policy if exists apps_admin on public.job_applications;
create policy apps_admin on public.job_applications for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- CV files ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.hospital_can_view_cv(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from job_applications a join hospitals h on h.id = a.hospital_id
                 where a.cv_path = p_path and h.owner_id = auth.uid() and h.status = 'approved')
$$;
revoke all on function public.hospital_can_view_cv(text) from public, anon;
grant execute on function public.hospital_can_view_cv(text) to authenticated;

drop policy if exists cv_insert on storage.objects;
create policy cv_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists cv_select on storage.objects;
create policy cv_select on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_admin()) or public.hospital_can_view_cv(name)));
drop policy if exists cv_delete on storage.objects;
create policy cv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- slug, safe links and publish time are set here, so they hold for admin edits too
create or replace function public.jobs_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.slug is null or new.slug = '' then new.slug := job_slug(new.id, new.post_title, new.hospital_name); end if;
  new.apply_url := clean_url(new.apply_url);
  new.source_url := clean_url(new.source_url);
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jobs_before_write on public.jobs;
create trigger jobs_before_write before insert or update on public.jobs for each row execute function public.jobs_before_write();

-- ---------- hospital side ----------
create or replace function public.register_hospital(p jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); h hospitals; nm text := clean_text(p->>'name', 150); hid bigint;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not rate_ok('register_hospital', 20, interval '1 day') then raise exception 'rate_limited'; end if;
  if nm is null or char_length(nm) < 3 then raise exception 'name_required'; end if;
  if clean_text(p->>'phone', 30) is null then raise exception 'phone_required'; end if;
  select * into h from hospitals where owner_id = uid;
  if found then
    if h.status = 'suspended' then raise exception 'suspended'; end if;
    update hospitals set name = nm, district = clean_text(p->>'district', 60), address = clean_text(p->>'address', 300),
      phone = clean_text(p->>'phone', 30), email = clean_text(p->>'email', 120), website = clean_url(p->>'website'),
      contact_person = clean_text(p->>'contact_person', 100), about = clean_text(p->>'about', 1000),
      -- a renamed hospital is checked again
      status = case when h.status = 'approved' and h.name is distinct from nm then 'pending' else h.status end,
      updated_at = now()
    where id = h.id returning id into hid;
  else
    insert into hospitals (owner_id, name, district, address, phone, email, website, contact_person, about)
    values (uid, nm, clean_text(p->>'district', 60), clean_text(p->>'address', 300), clean_text(p->>'phone', 30),
            clean_text(p->>'email', 120), clean_url(p->>'website'), clean_text(p->>'contact_person', 100), clean_text(p->>'about', 1000))
    returning id into hid;
  end if;
  return hid;
end $$;

create or replace function public.job_slug(p_id bigint, p_title text, p_hospital text)
returns text language sql immutable as $$
  select left(trim(both '-' from regexp_replace(lower(coalesce(p_hospital, '') || ' ' || coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g')), 70)
         || case when lower(coalesce(p_hospital, '') || coalesce(p_title, '')) ~ '[a-z0-9]' then '-' else 'nurse-job-' end || p_id
$$;

-- a hospital creates or edits its own vacancy; it (re)enters review and goes live once the admin approves
create or replace function public.hospital_save_job(p jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); h hospitals; jid bigint := nullif(p->>'id', '')::bigint; t text := clean_text(p->>'post_title', 150);
begin
  if uid is null then raise exception 'auth_required'; end if;
  select * into h from hospitals where owner_id = uid;
  if not found then raise exception 'hospital_required'; end if;
  if h.status in ('rejected', 'suspended') then raise exception 'hospital_blocked'; end if;
  if not rate_ok('hospital_save_job', 30, interval '1 day') then raise exception 'rate_limited'; end if;
  if t is null then raise exception 'title_required'; end if;
  if (p->>'deadline') is not null and (p->>'deadline') <> '' and (p->>'deadline')::date < current_date then raise exception 'bad_deadline'; end if;
  if jid is null then
    insert into jobs (hospital_id, hospital_name, district, location, post_title, vacancies, salary, job_type, qualifications,
                      description, deadline, apply_mode, apply_url, apply_info, status, created_by)
    values (h.id, h.name, coalesce(clean_text(p->>'district', 60), h.district), clean_text(p->>'location', 200), t,
            nullif(p->>'vacancies', '')::int, clean_text(p->>'salary', 100), clean_text(p->>'job_type', 50),
            clean_text(p->>'qualifications', 3000), clean_text(p->>'description', 5000), nullif(p->>'deadline', '')::date,
            'site', null, clean_text(p->>'apply_info', 500), 'pending', uid)
    returning id into jid;
  else
    update jobs set district = coalesce(clean_text(p->>'district', 60), h.district), location = clean_text(p->>'location', 200),
      post_title = t, vacancies = nullif(p->>'vacancies', '')::int, salary = clean_text(p->>'salary', 100),
      job_type = clean_text(p->>'job_type', 50), qualifications = clean_text(p->>'qualifications', 3000),
      description = clean_text(p->>'description', 5000), deadline = nullif(p->>'deadline', '')::date,
      apply_info = clean_text(p->>'apply_info', 500), status = 'pending', updated_at = now()
    where id = jid and hospital_id = h.id;
    if not found then raise exception 'not_found'; end if;
  end if;
  return jid;
end $$;

create or replace function public.hospital_close_job(p_job bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update jobs set status = 'closed', updated_at = now()
  where id = p_job and hospital_id in (select id from hospitals where owner_id = auth.uid());
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.hospital_set_application(p_app bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('viewed', 'shortlisted', 'rejected', 'hired') then raise exception 'bad_status'; end if;
  update job_applications set status = p_status, updated_at = now()
  where id = p_app and hospital_id in (select id from hospitals where owner_id = auth.uid() and status = 'approved');
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------- candidate side ----------
create or replace function public.save_candidate_profile(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cv text := clean_text(p->>'cv_path', 300);
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not rate_ok('save_candidate_profile', 60, interval '1 hour') then raise exception 'rate_limited'; end if;
  if clean_text(p->>'full_name', 100) is null then raise exception 'name_required'; end if;
  if clean_text(p->>'phone', 30) is null then raise exception 'phone_required'; end if;
  if clean_text(p->>'qualification', 100) is null then raise exception 'qualification_required'; end if;
  if cv is not null and split_part(cv, '/', 1) <> uid::text then raise exception 'bad_file'; end if;
  insert into candidate_profiles as c (user_id, full_name, phone, email, district, address, date_of_birth, gender, qualification,
      institute, passing_year, bnmc_reg, experience_years, experience, current_workplace, skills, about, cv_path, updated_at)
  values (uid, clean_text(p->>'full_name', 100), clean_text(p->>'phone', 30), clean_text(p->>'email', 120),
      clean_text(p->>'district', 60), clean_text(p->>'address', 300), nullif(p->>'date_of_birth', '')::date,
      clean_text(p->>'gender', 20), clean_text(p->>'qualification', 100), clean_text(p->>'institute', 150),
      nullif(p->>'passing_year', '')::int, clean_text(p->>'bnmc_reg', 50),
      least(greatest(nullif(p->>'experience_years', '')::numeric, 0), 60), clean_text(p->>'experience', 2000),
      clean_text(p->>'current_workplace', 150), clean_text(p->>'skills', 500), clean_text(p->>'about', 1000), cv, now())
  on conflict (user_id) do update set full_name = excluded.full_name, phone = excluded.phone, email = excluded.email,
      district = excluded.district, address = excluded.address, date_of_birth = excluded.date_of_birth, gender = excluded.gender,
      qualification = excluded.qualification, institute = excluded.institute, passing_year = excluded.passing_year,
      bnmc_reg = excluded.bnmc_reg, experience_years = excluded.experience_years, experience = excluded.experience,
      current_workplace = excluded.current_workplace, skills = excluded.skills, about = excluded.about,
      cv_path = excluded.cv_path, updated_at = now();
end $$;

create or replace function public.apply_job(p_job bigint, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); j jobs; c candidate_profiles; aid bigint;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not rate_ok('apply_job', 40, interval '1 day') then raise exception 'rate_limited'; end if;
  select * into j from jobs where id = p_job and status = 'published';
  if not found then raise exception 'not_found'; end if;
  if j.apply_mode <> 'site' then raise exception 'apply_elsewhere'; end if;
  if j.deadline is not null and j.deadline < (now() at time zone 'Asia/Dhaka')::date then raise exception 'deadline_passed'; end if;
  if exists (select 1 from hospitals where id = j.hospital_id and owner_id = uid) then raise exception 'own_job'; end if;
  select * into c from candidate_profiles where user_id = uid;
  if not found then raise exception 'cv_required'; end if;
  insert into job_applications (job_id, user_id, hospital_id, profile, cv_path, note)
  values (j.id, uid, j.hospital_id, to_jsonb(c) - 'user_id' - 'cv_path' - 'updated_at', c.cv_path, clean_text(p_note, 1000))
  on conflict (job_id, user_id) do nothing
  returning id into aid;
  if aid is null then raise exception 'already_applied'; end if;
  return aid;
end $$;

-- function access: signed-in users only (anonymous visitors only read published jobs through RLS)
do $$ declare f text; begin
  foreach f in array array['register_hospital(jsonb)', 'hospital_save_job(jsonb)', 'hospital_close_job(bigint)',
    'hospital_set_application(bigint,text)', 'save_candidate_profile(jsonb)', 'apply_job(bigint,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
