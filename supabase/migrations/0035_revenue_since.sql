-- Revenue on the admin dashboard counts from a start date (set 11 Nov 2026 so earlier test payments don't show).
insert into public.app_settings (key, value, is_public)
values ('revenue_since', to_jsonb(now()), false)
on conflict (key) do update set value = excluded.value;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $function$
declare since timestamptz := coalesce((select (value #>> '{}')::timestamptz from public.app_settings where key = 'revenue_since'), '-infinity');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'new_users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'premium_users', (select count(distinct user_id) from public.subscriptions where plan = 'lifetime' and status = 'active'),
    'questions', (select count(*) from public.questions),
    'premium_questions', (select count(*) from public.questions where is_premium),
    'attempts', (select count(*) from public.test_attempts where status = 'submitted'),
    'attempts_7d', (select count(*) from public.test_attempts where status = 'submitted' and submitted_at > now() - interval '7 days'),
    'revenue', (select coalesce(sum(amount),0) from public.payments where status = 'paid' and coalesce(verified_at, created_at) >= since),
    'revenue_30d', (select coalesce(sum(amount),0) from public.payments where status = 'paid' and coalesce(verified_at, created_at) >= greatest(since, now() - interval '30 days')),
    'avg_percent', (select round(avg(case when max_score > 0 then score*100/max_score end),1) from public.test_attempts where status = 'submitted'),
    'subjects', (select coalesce(jsonb_agg(jsonb_build_object('name_en', s.name_en, 'name_bn', s.name_bn,
                   'questions', (select count(*) from public.questions q where q.subject_id = s.id),
                   'answered', coalesce(x.att,0), 'correct', coalesce(x.cor,0)) order by s.sort_order), '[]'::jsonb)
                 from public.subjects s left join (
                   select q.subject_id, sum(st.attempts) att, sum(st.correct_count) cor
                   from public.user_question_stats st join public.questions q on q.id = st.question_id group by q.subject_id) x
                 on x.subject_id = s.id),
    'top_students', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
                 select p.full_name, count(*) tests, round(avg(a.score*100/nullif(a.max_score,0)),1) avg_percent
                 from public.test_attempts a join public.profiles p on p.id = a.user_id
                 where a.status = 'submitted' group by p.id, p.full_name
                 order by avg_percent desc nulls last limit 10) t)
  );
end $function$;
