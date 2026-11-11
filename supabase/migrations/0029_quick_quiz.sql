-- 5 random free questions (with a real explanation) for the no-login quiz on the home page.
-- Only free questions, so returning the answer key here gives nothing premium away.
create or replace function public.public_quick_quiz(p_count int default 5)
returns table (id bigint, question_bn text, options_bn text[], correct_option smallint, explanation_bn text, subject_bn text)
language sql volatile security definer set search_path = public as $$
  select q.id, q.question_bn, q.options_bn, q.correct_option, q.explanation_bn, s.name_bn
  from public.questions q join public.subjects s on s.id = q.subject_id
  where q.is_active and not q.is_premium and array_length(q.options_bn, 1) = 4
    and q.explanation_bn is not null and q.explanation_bn not like 'সঠিক উত্তর:%'
    and q.subject_id in (1, 2, 3, 4, 5, 6, 7, 10, 11, 12)
    and length(q.question_bn) < 220
  order by random()
  limit least(greatest(coalesce(p_count, 5), 1), 10)
$$;
revoke all on function public.public_quick_quiz(int) from public;
grant execute on function public.public_quick_quiz(int) to anon, authenticated;
