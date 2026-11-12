-- Weekly backup to the owner's Google Drive: a Google Apps Script in the owner's own Google account calls this
-- function with a secret token (only its SHA-256 is stored here) and saves each table as JSON in Drive.
-- Read-only, whitelisted tables, page by page.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.backup_config (
  id int primary key default 1 check (id = 1),
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.backup_config enable row level security;
revoke all on public.backup_config from anon, authenticated;

create or replace function public.backup_export(p_token text, p_table text, p_offset int default 0, p_limit int default 2000)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare ok boolean; res jsonb;
  tabs text[] := array['profiles', 'subscriptions', 'payments', 'coupons', 'app_settings', 'subjects', 'topics', 'exams', 'questions',
    'mock_tests', 'test_attempts', 'user_question_stats', 'bookmarks', 'question_reports', 'notices', 'circulars', 'reviews',
    'written_papers', 'written_questions', 'pyq_submissions', 'weekly_tests', 'hospitals', 'hospital_verifications', 'jobs',
    'job_applications', 'job_reports', 'candidate_profiles'];
begin
  select encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') = token_hash into ok from backup_config where id = 1;
  if ok is not true then raise exception 'forbidden'; end if;
  if p_table = '__list' then
    return (select jsonb_agg(jsonb_build_object('table', t)) from unnest(tabs || array['auth_users']) t);
  end if;
  p_limit := least(greatest(coalesce(p_limit, 2000), 1), 5000);
  if p_table = 'auth_users' then
    select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) into res from (
      select id, email, phone, created_at, last_sign_in_at, email_confirmed_at, raw_user_meta_data
      from auth.users order by created_at, id limit p_limit offset p_offset) u;
    return res;
  end if;
  if not (p_table = any (tabs)) then raise exception 'bad_table'; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select * from public.%I order by 1 limit %s offset %s) t',
                 p_table, p_limit, greatest(p_offset, 0)) into res;
  return res;
end $$;
revoke all on function public.backup_export(text, text, int, int) from public;
grant execute on function public.backup_export(text, text, int, int) to anon;
