-- Admin home cards open lists: every submitted test (who, which test, questions, right / wrong / skipped, score)
-- and every premium member (since when, and whether they paid or were given it).

create or replace function public.admin_test_attempts(p_search text default null, p_mode text default null, p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(coalesce(p_search, '')), ''); m text := nullif(trim(coalesce(p_mode, '')), '');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (
    with f as (
      select a.*, p.full_name, p.phone, u.email
      from public.test_attempts a
      left join public.profiles p on p.id = a.user_id
      left join auth.users u on u.id = a.user_id
      where a.status = 'submitted'
        and (m is null or a.mode = m)
        and (q is null or p.full_name ilike '%'||q||'%' or u.email ilike '%'||q||'%' or p.phone ilike '%'||q||'%')
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'people', (select count(distinct user_id) from f),
      'avg_percent', (select round(avg(case when max_score > 0 then score * 100 / max_score end), 1) from f),
      'rows', coalesce((select jsonb_agg(row_to_json(t)) from (
        select f.id, f.user_id, f.full_name, f.email, f.phone, f.mode, coalesce(f.title_bn, f.title_en) as title, f.week_start,
               f.started_at, f.submitted_at, f.total_questions, f.correct, f.wrong, f.skipped, f.score, f.max_score,
               greatest(0, extract(epoch from (f.submitted_at - f.started_at)))::int as seconds,
               public.has_premium(f.user_id) as premium
        from f order by f.submitted_at desc nulls last, f.started_at desc
        limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) t), '[]'::jsonb)
    ));
end $$;

revoke all on function public.admin_test_attempts(text, text, int, int) from public, anon;
grant execute on function public.admin_test_attempts(text, text, int, int) to authenticated;

-- Same row shape as admin_list_users, only current premium members, newest premium first.
create or replace function public.admin_premium_users()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select p.id, p.full_name, p.phone, p.role, p.created_at, u.email, u.last_sign_in_at,
           true as premium,
           (select count(*) from public.test_attempts a where a.user_id = p.id and a.status = 'submitted') as tests,
           coalesce(st.practiced, 0) as practiced, coalesce(st.right_now, 0) as practice_correct, st.last_practice,
           (select h.name from public.hospitals h where h.owner_id = p.id) as hospital,
           greatest((select max(v.last_seen) from public.page_views v where v.user_id = p.id),
                    st.last_practice,
                    (select max(coalesce(a.submitted_at, a.started_at)) from public.test_attempts a where a.user_id = p.id),
                    u.last_sign_in_at) as last_active,
           s.starts_at as premium_since, s.ends_at as premium_until,
           (s.payment_id is not null) as premium_paid, pay.amount as premium_amount
    from (select distinct on (user_id) user_id, starts_at, ends_at, payment_id
          from public.subscriptions
          where plan = 'lifetime' and status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now())
          order by user_id, starts_at desc) s
    join public.profiles p on p.id = s.user_id
    join auth.users u on u.id = p.id
    left join public.payments pay on pay.id = s.payment_id
    left join lateral (
      select count(*) as practiced, count(*) filter (where q.last_correct) as right_now, max(q.last_seen_at) as last_practice
      from public.user_question_stats q where q.user_id = p.id) st on true
    order by s.starts_at desc) t);
end $$;

revoke all on function public.admin_premium_users() from public, anon;
grant execute on function public.admin_premium_users() to authenticated;
