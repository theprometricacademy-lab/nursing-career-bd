-- Public, Google-indexable previous-year papers (/question-solution, /question-solution/[slug]).
alter table public.exams add column if not exists slug text;
create unique index if not exists exams_slug_key on public.exams (slug);

-- Slug from the English name, e.g. 'senior-staff-nurse-bpsc-02-09-2023'
update public.exams set slug = trim(both '-' from regexp_replace(lower(name_en), '[^a-z0-9]+', '-', 'g'))
where slug is null;

create or replace function public.public_exam_list()
returns table (id int, slug text, name_bn text, name_en text, year int, exam_date date, total bigint)
language sql stable security definer set search_path = public as $$
  select e.id, e.slug, e.name_bn, e.name_en, e.year, e.exam_date,
         (select count(*) from public.questions q where q.exam_id = e.id and q.is_active)
  from public.exams e
  where e.is_active and e.slug is not null and e.name_bn not like '%নমুনা%'
  order by coalesce(e.exam_date, make_date(e.year, 6, 30)) desc
$$;
revoke all on function public.public_exam_list() from public;
grant execute on function public.public_exam_list() to anon, authenticated;

-- Every question of one paper with its answer; explanations only where a real one exists
create or replace function public.public_exam_paper(p_slug text)
returns table (id bigint, subject_slug text, subject_bn text, difficulty text, question_bn text, options_bn text[], correct_option smallint, explanation_bn text)
language sql stable security definer set search_path = public as $$
  select q.id, s.slug, s.name_bn, q.difficulty, q.question_bn, q.options_bn, q.correct_option,
         case when q.explanation_bn like 'সঠিক উত্তর:%' then null else q.explanation_bn end
  from public.questions q
  join public.exams e on e.id = q.exam_id
  left join public.subjects s on s.id = q.subject_id
  where e.slug = p_slug and e.is_active and q.is_active and array_length(q.options_bn, 1) = 4
  order by q.id
$$;
revoke all on function public.public_exam_paper(text) from public;
grant execute on function public.public_exam_paper(text) to anon, authenticated;
