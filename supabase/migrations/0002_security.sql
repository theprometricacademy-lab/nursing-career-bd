-- Row Level Security, helper functions and new-user trigger

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_premium(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and plan = 'lifetime' and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  );
$$;

create or replace function public.can_take_test(p_test int, p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not is_premium from public.mock_tests where id = p_test), false)
      or public.has_premium(p_user)
      or exists (select 1 from public.subscriptions
                 where user_id = p_user and plan = 'single_test' and mock_test_id = p_test
                   and status = 'active');
$$;

-- Create profile on sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', new.phone));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rate limiter: returns true if allowed
create or replace function public.rate_ok(p_action text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
        n int;
begin
  insert into public.rate_limits(user_id, action, window_start, hits)
  values (auth.uid(), p_action, w, 1)
  on conflict (user_id, action, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return n <= p_max;
end $$;

-- ---------- Enable RLS everywhere ----------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.mock_tests enable row level security;
alter table public.test_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.user_question_stats enable row level security;
alter table public.bookmarks enable row level security;
alter table public.app_settings enable row level security;
alter table public.coupons enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notices enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: own row read; own row update of safe columns only; admin all
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, language) on public.profiles to authenticated;
-- admins change roles through the admin_set_role() function below

-- public catalogue
create policy subjects_read on public.subjects for select using (true);
create policy subjects_admin on public.subjects for all using (public.is_admin()) with check (public.is_admin());
create policy topics_read on public.topics for select using (true);
create policy topics_admin on public.topics for all using (public.is_admin()) with check (public.is_admin());
create policy exams_read on public.exams for select using (true);
create policy exams_admin on public.exams for all using (public.is_admin()) with check (public.is_admin());
create policy mock_tests_read on public.mock_tests for select using (is_published or public.is_admin());
create policy mock_tests_admin on public.mock_tests for all using (public.is_admin()) with check (public.is_admin());
create policy notices_read on public.notices for select using (is_published or public.is_admin());
create policy notices_admin on public.notices for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.app_settings for select using (is_public or public.is_admin());
create policy settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- questions: ADMIN ONLY. Students go through functions in 0003.
create policy questions_admin on public.questions for all using (public.is_admin()) with check (public.is_admin());

-- attempts: own read only; writes only through functions
create policy attempts_own_read on public.test_attempts for select using (user_id = auth.uid() or public.is_admin());
create policy answers_own_read on public.attempt_answers for select using (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin())));

create policy uqs_own_read on public.user_question_stats for select using (user_id = auth.uid() or public.is_admin());

create policy bookmarks_own on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- commerce: users read their own; only server (service role) / admin writes
create policy payments_own_read on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy payments_admin on public.payments for update using (public.is_admin()) with check (public.is_admin());
create policy subs_own_read on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy subs_admin on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
create policy coupons_admin on public.coupons for all using (public.is_admin()) with check (public.is_admin());
-- rate_limits: no policies → no direct access

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('student','admin') then raise exception 'bad role'; end if;
  update public.profiles set role = p_role where id = p_user;
end $$;
