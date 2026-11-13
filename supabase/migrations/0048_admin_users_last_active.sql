-- Admin users list: last time each member was active on the site (page views, practice or tests), beside last login.
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select p.id, p.full_name, p.phone, p.role, p.created_at, u.email, u.last_sign_in_at,
           public.has_premium(p.id) as premium,
           (select count(*) from public.test_attempts a where a.user_id = p.id and a.status = 'submitted') as tests,
           coalesce(st.practiced, 0) as practiced, coalesce(st.right_now, 0) as practice_correct, st.last_practice,
           (select h.name from public.hospitals h where h.owner_id = p.id) as hospital,
           greatest((select max(v.last_seen) from public.page_views v where v.user_id = p.id),
                    st.last_practice,
                    (select max(coalesce(a.submitted_at, a.started_at)) from public.test_attempts a where a.user_id = p.id),
                    u.last_sign_in_at) as last_active
    from public.profiles p join auth.users u on u.id = p.id
    left join lateral (
      select count(*) as practiced, count(*) filter (where s.last_correct) as right_now, max(s.last_seen_at) as last_practice
      from public.user_question_stats s where s.user_id = p.id) st on true
    where p_search is null or p_search = '' or u.email ilike '%'||p_search||'%'
       or p.full_name ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%'
    order by p.created_at desc limit least(p_limit, 200) offset p_offset) t);
end $function$;
REVOKE ALL ON FUNCTION public.admin_list_users(text, integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO authenticated;
