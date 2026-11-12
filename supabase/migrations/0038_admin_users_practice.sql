-- Admin users list: how many questions each user has practised in the question bank
-- (distinct questions answered), how many of those were right the last time, and when they last practised.
create or replace function public.admin_list_users(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'auth' as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select p.id, p.full_name, p.phone, p.role, p.created_at, u.email, u.last_sign_in_at,
           public.has_premium(p.id) as premium,
           (select count(*) from public.test_attempts a where a.user_id = p.id and a.status = 'submitted') as tests,
           coalesce(st.practiced, 0) as practiced, coalesce(st.right_now, 0) as practice_correct, st.last_practice
    from public.profiles p join auth.users u on u.id = p.id
    left join lateral (
      select count(*) as practiced, count(*) filter (where s.last_correct) as right_now, max(s.last_seen_at) as last_practice
      from public.user_question_stats s where s.user_id = p.id) st on true
    where p_search is null or p_search = '' or u.email ilike '%'||p_search||'%'
       or p.full_name ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%'
    order by p.created_at desc limit least(p_limit, 200) offset p_offset) t);
end $function$;
