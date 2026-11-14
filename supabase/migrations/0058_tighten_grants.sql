-- Defence in depth. Row level security already blocks these; the grants themselves are now gone too.
-- 1. Nobody using the public API may empty a table (TRUNCATE is not covered by row level security).
revoke truncate on all tables in schema public from anon, authenticated;
-- 2. Visitors who are not signed in never write to a table directly: everything they do goes through functions.
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke truncate on tables from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete on tables from anon;
-- 3. Trigger functions are not part of the API.
revoke all on function public.circular_notify() from public, anon, authenticated;
revoke all on function public.notifications_after_insert() from public, anon, authenticated;
