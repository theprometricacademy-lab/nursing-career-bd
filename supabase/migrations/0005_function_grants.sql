-- Lock down who can call what. Postgres grants EXECUTE to PUBLIC by default.
do $$
declare f text;
begin
  foreach f in array array[
    'admin_grant_premium(uuid,text,integer)','admin_list_users(text,integer,integer)','admin_set_role(uuid,text)',
    'admin_stats()','can_take_test(integer,uuid)','check_answer(bigint,smallint)','get_attempt(uuid)',
    'handle_new_user()','has_premium(uuid)','list_questions(integer,integer,integer,integer,text,text,text,integer,integer)',
    'my_stats()','quote_price(text,integer,text)','rate_ok(text,integer,interval)',
    'save_answer(uuid,integer,smallint,boolean,boolean)','start_attempt(text,integer,integer,integer,integer,integer)',
    'submit_attempt(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
  end loop;
end $$;

-- Internal helpers: only callable from inside other definer functions / server
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.rate_ok(text,integer,interval) from authenticated;
revoke execute on function public.has_premium(uuid) from authenticated;
revoke execute on function public.can_take_test(integer,uuid) from authenticated;

-- RLS policies call is_admin() as the requesting role, so it must stay callable.
grant execute on function public.is_admin() to anon, authenticated;
-- Pricing page shows prices to visitors
grant execute on function public.quote_price(text,integer,text) to anon;

-- Guests may browse question text (never answers); premium text stays hidden for them.
grant execute on function public.list_questions(integer,integer,integer,integer,text,text,text,integer,integer) to anon;
