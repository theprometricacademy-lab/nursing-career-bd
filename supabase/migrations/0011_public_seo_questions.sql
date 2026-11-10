-- Public, Google-indexable question samples for the SEO pages (/nursing-mcq, /mcq/[slug]).
create or replace function public.public_free_questions()
returns table (id bigint, subject_slug text, subject_bn text, category text, question_bn text, options_bn text[], correct_option smallint, explanation_bn text)
language sql stable security definer set search_path = public as $$
  select q.id, s.slug, s.name_bn, s.category, q.question_bn, q.options_bn, q.correct_option, q.explanation_bn
  from public.questions q join public.subjects s on s.id = q.subject_id
  where q.is_active and not q.is_premium and s.is_active and q.question_bn is not null
  order by s.category desc, s.sort_order nulls last, s.id, q.id
  limit 200
$$;
revoke all on function public.public_free_questions() from public;
grant execute on function public.public_free_questions() to anon, authenticated;

-- Up to 30 fixed medium/hard questions per subject (hard first), shown with answers on the public subject pages.
create or replace function public.public_sample_questions(p_slug text, p_limit int default 25)
returns table (id bigint, subject_slug text, subject_bn text, subject_en text, category text, difficulty text, question_bn text, options_bn text[], correct_option smallint, explanation_bn text)
language sql stable security definer set search_path = public as $$
  select q.id, s.slug, s.name_bn, s.name_en, s.category, q.difficulty, q.question_bn, q.options_bn, q.correct_option, q.explanation_bn
  from public.questions q join public.subjects s on s.id = q.subject_id
  where s.slug = p_slug and s.is_active and q.is_active and q.question_bn is not null
    and q.difficulty in ('medium','hard') and array_length(q.options_bn, 1) = 4
  order by (q.difficulty = 'hard') desc, md5(q.id::text)
  limit least(greatest(coalesce(p_limit, 25), 1), 30)
$$;
revoke all on function public.public_sample_questions(text, int) from public;
grant execute on function public.public_sample_questions(text, int) to anon, authenticated;
