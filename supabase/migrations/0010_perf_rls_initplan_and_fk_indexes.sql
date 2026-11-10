-- Evaluate auth.uid()/is_admin() once per query instead of per row, and index foreign keys.
alter policy profiles_self_read on public.profiles using ((id = (select auth.uid())) or (select public.is_admin()));
alter policy profiles_self_update on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy attempts_own_read on public.test_attempts using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy answers_own_read on public.attempt_answers using (exists (select 1 from public.test_attempts a where a.id = attempt_answers.attempt_id and (a.user_id = (select auth.uid()) or (select public.is_admin()))));
alter policy uqs_own_read on public.user_question_stats using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy bookmarks_own on public.bookmarks using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy payments_own_read on public.payments using ((user_id = (select auth.uid())) or (select public.is_admin()));
alter policy subs_own_read on public.subscriptions using ((user_id = (select auth.uid())) or (select public.is_admin()));
create index if not exists attempt_answers_question_id_idx on public.attempt_answers (question_id);
create index if not exists bookmarks_question_id_idx on public.bookmarks (question_id);
create index if not exists user_question_stats_question_id_idx on public.user_question_stats (question_id);
create index if not exists test_attempts_mock_test_id_idx on public.test_attempts (mock_test_id);
create index if not exists subscriptions_payment_id_idx on public.subscriptions (payment_id);
create index if not exists subscriptions_mock_test_id_idx on public.subscriptions (mock_test_id);
create index if not exists payments_mock_test_id_idx on public.payments (mock_test_id);
create index if not exists payments_coupon_id_idx on public.payments (coupon_id);
create index if not exists questions_active_difficulty_idx on public.questions (difficulty) where is_active;
