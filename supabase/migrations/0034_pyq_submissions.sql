-- Visitors send photos/PDFs of previous-year papers we don't have yet. Files live in a private bucket;
-- the admin reviews them, and once the paper is added (or rejected) the files are deleted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pyq-uploads', 'pyq-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists pyq_upload_insert on storage.objects;
create policy pyq_upload_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pyq-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists pyq_upload_select on storage.objects;
create policy pyq_upload_select on storage.objects for select to authenticated
  using (bucket_id = 'pyq-uploads' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
drop policy if exists pyq_upload_delete on storage.objects;
create policy pyq_upload_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pyq-uploads' and (select public.is_admin()));

create table if not exists public.pyq_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exam_type text not null check (exam_type in ('mcq', 'written')),
  exam_name text not null check (char_length(exam_name) between 3 and 200),
  year int check (year between 1990 and 2100),
  note text check (char_length(note) <= 1000),
  files text[] not null,
  status text not null default 'pending' check (status in ('pending', 'added', 'rejected')),
  files_deleted boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pyq_submissions_status_idx on public.pyq_submissions (status, created_at desc);
alter table public.pyq_submissions enable row level security;
drop policy if exists pyqs_admin_all on public.pyq_submissions;
create policy pyqs_admin_all on public.pyq_submissions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists pyqs_own_select on public.pyq_submissions;
create policy pyqs_own_select on public.pyq_submissions for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.submit_pyq(p_type text, p_name text, p_year int, p_note text, p_files text[])
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); id bigint; f text;
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_type not in ('mcq', 'written') then raise exception 'bad_type'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 3 then raise exception 'name_required'; end if;
  if p_files is null or array_length(p_files, 1) is null or array_length(p_files, 1) > 20 then raise exception 'bad_files'; end if;
  foreach f in array p_files loop
    if split_part(f, '/', 1) <> uid::text then raise exception 'bad_files'; end if;
  end loop;
  if (select count(*) from pyq_submissions where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many';
  end if;
  insert into pyq_submissions (user_id, exam_type, exam_name, year, note, files)
  values (uid, p_type, left(btrim(p_name), 200), p_year, nullif(left(btrim(coalesce(p_note, '')), 1000), ''), p_files)
  returning pyq_submissions.id into id;
  return id;
end $$;
revoke all on function public.submit_pyq(text, text, int, text, text[]) from public, anon;
grant execute on function public.submit_pyq(text, text, int, text, text[]) to authenticated;
