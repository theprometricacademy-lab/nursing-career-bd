-- Government nursing job circulars shown in the side panel, /circulars and /circulars/[slug].
create table public.circulars (
  id bigserial primary key,
  slug text unique,
  title_bn text not null,
  org_bn text not null,
  ministry_bn text,
  recruiter_bn text,
  post_name_bn text,
  total_posts int,
  grade_bn text,
  salary_bn text,
  job_type text not null default 'permanent' check (job_type in ('permanent','contract','commission','temporary')),
  qualification_bn text,
  age_limit_bn text,
  fee_bn text,
  details_bn text,
  exam_info_bn text,
  circular_no text,
  publish_at timestamptz,
  apply_start timestamptz,
  apply_end timestamptz,
  apply_url text,
  official_url text,
  pdf_url text,
  source_name text,
  source_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index circulars_apply_end_idx on public.circulars (apply_end desc) where is_published;

create or replace function public.circulars_before_write() returns trigger language plpgsql as $$
begin
  new.slug := coalesce(nullif(trim(new.slug), ''), 'circular-' || new.id);
  new.updated_at := now();
  return new;
end $$;
create trigger circulars_before_write before insert or update on public.circulars
  for each row execute function public.circulars_before_write();

alter table public.circulars enable row level security;
create policy circulars_read on public.circulars for select using (is_published or (select public.is_admin()));
create policy circulars_admin_insert on public.circulars for insert with check ((select public.is_admin()));
create policy circulars_admin_update on public.circulars for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy circulars_admin_delete on public.circulars for delete using ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circulars', 'circulars', true, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy circulars_files_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'circulars' and (select public.is_admin()));
create policy circulars_files_admin_update on storage.objects for update to authenticated using (bucket_id = 'circulars' and (select public.is_admin()));
create policy circulars_files_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'circulars' and (select public.is_admin()));
