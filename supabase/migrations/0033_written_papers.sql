-- Previous-year WRITTEN exam papers: questions typed as text (searchable, mobile friendly) with model answers.
create table if not exists public.written_papers (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title_bn text not null,
  post_bn text,                 -- e.g. 'সিনিয়র স্টাফ নার্স'
  org_bn text,                  -- e.g. 'বাংলাদেশ সরকারি কর্ম কমিশন (পিএসসি)'
  exam_date date,
  year int not null,
  total_marks int,
  duration_bn text,             -- e.g. '৪ ঘণ্টা'
  source_note text,             -- where the paper came from (shown under the paper)
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.written_questions (
  id bigint generated always as identity primary key,
  paper_id bigint not null references public.written_papers(id) on delete cascade,
  section text not null default 'nursing' check (section in ('nursing', 'bangla', 'english', 'gk', 'math', 'other')),
  q_no text,                    -- as printed: '১(ক)', '2(b)'
  marks numeric,
  question text not null,
  answer text,                  -- model answer (our own writing); null = not written yet
  sort int not null default 0
);
create index if not exists written_questions_paper_idx on public.written_questions (paper_id, sort);

alter table public.written_papers enable row level security;
alter table public.written_questions enable row level security;
drop policy if exists wp_public_read on public.written_papers;
create policy wp_public_read on public.written_papers for select to anon, authenticated using (is_published);
drop policy if exists wp_admin_all on public.written_papers;
create policy wp_admin_all on public.written_papers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists wq_public_read on public.written_questions;
create policy wq_public_read on public.written_questions for select to anon, authenticated
  using (exists (select 1 from public.written_papers p where p.id = paper_id and p.is_published));
drop policy if exists wq_admin_all on public.written_questions;
create policy wq_admin_all on public.written_questions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- list + one paper, for the server-rendered pages
create or replace function public.public_written_list()
returns table (slug text, title_bn text, post_bn text, org_bn text, exam_date date, year int, total_marks int, duration_bn text, questions bigint)
language sql stable security definer set search_path = public as $$
  select p.slug, p.title_bn, p.post_bn, p.org_bn, p.exam_date, p.year, p.total_marks, p.duration_bn,
         (select count(*) from public.written_questions q where q.paper_id = p.id)
  from public.written_papers p where p.is_published
  order by coalesce(p.exam_date, make_date(p.year, 6, 30)) desc;
$$;
create or replace function public.public_written_paper(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'paper', to_jsonb(p) - 'id' - 'is_published' - 'created_at',
    'questions', coalesce((select jsonb_agg(jsonb_build_object('section', q.section, 'q_no', q.q_no, 'marks', q.marks,
                     'question', q.question, 'answer', q.answer) order by q.sort, q.id)
                   from public.written_questions q where q.paper_id = p.id), '[]'::jsonb))
  from public.written_papers p where p.slug = p_slug and p.is_published;
$$;
revoke all on function public.public_written_list() from public;
revoke all on function public.public_written_paper(text) from public;
grant execute on function public.public_written_list() to anon, authenticated;
grant execute on function public.public_written_paper(text) to anon, authenticated;
