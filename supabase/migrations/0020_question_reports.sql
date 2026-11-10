-- Users can report a wrong / broken question straight from the question; admins review them.
create table if not exists public.question_reports (
  id bigint generated always as identity primary key,
  question_id bigint not null references public.questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  reason text not null check (reason in ('wrong_answer', 'wrong_option', 'typo', 'wrong_explanation', 'other')),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists question_reports_status_idx on public.question_reports (status, created_at desc);
create index if not exists question_reports_question_idx on public.question_reports (question_id);
alter table public.question_reports enable row level security;

drop policy if exists qr_admin_all on public.question_reports;
create policy qr_admin_all on public.question_reports for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists qr_own_select on public.question_reports;
create policy qr_own_select on public.question_reports for select to authenticated
  using (user_id = (select auth.uid()));

-- Logged-in users report through this function (max 30 reports a day, one open report per question per user)
create or replace function public.report_question(p_question bigint, p_reason text, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  if (select count(*) from question_reports where user_id = uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too_many_reports';
  end if;
  if exists (select 1 from question_reports where user_id = uid and question_id = p_question and status = 'open') then
    return 'already_reported';
  end if;
  insert into question_reports (question_id, user_id, reason, note)
  values (p_question, uid, p_reason, nullif(btrim(left(coalesce(p_note, ''), 1000)), ''));
  return 'ok';
end $$;
revoke all on function public.report_question(bigint, text, text) from public;
grant execute on function public.report_question(bigint, text, text) to authenticated;
