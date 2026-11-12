-- Security hardening
-- 1) admin functions: not callable by signed-out visitors at all (they also check is_admin inside)
revoke execute on function public.admin_app_stats(text) from anon, public;
revoke execute on function public.admin_session_views(uuid) from anon, public;
revoke execute on function public.admin_usage() from anon, public;
revoke execute on function public.admin_visitors(text) from anon, public;
-- 2) fixed search_path on helper functions
alter function public.circulars_before_write() set search_path = public;
alter function public.set_referral_code() set search_path = public;
alter function public.bd_week_start(timestamptz) set search_path = public;
alter function public.clean_text(text, int) set search_path = public;
alter function public.clean_url(text) set search_path = public;
alter function public.job_slug(bigint, text, text) set search_path = public;
-- 3) jobs tables: signed-out visitors may only read published jobs; no write privileges at all
revoke insert, update, delete, truncate on public.hospitals, public.jobs, public.candidate_profiles, public.job_applications, public.weekly_tests from anon;
revoke select on public.hospitals, public.candidate_profiles, public.job_applications, public.weekly_tests from anon;
-- signed-in users write only through the checked functions (admins keep direct access via their policies)
revoke truncate on public.hospitals, public.jobs, public.candidate_profiles, public.job_applications, public.weekly_tests from authenticated;
-- 4) the one-off question backup tables are not part of the API
revoke all on public.free_q_backup_20261112, public.free_q_pick_20261112 from anon, authenticated;
