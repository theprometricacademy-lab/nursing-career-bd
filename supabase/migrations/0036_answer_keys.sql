-- Answers for the questions currently on screen, fetched in one go so a tap shows the result instantly.
-- Same access rule as check_answer (premium questions only for premium members); stats are still recorded by check_answer.
create or replace function public.answer_keys(p_ids bigint[])
returns table (id bigint, correct_option smallint, explanation_en text, explanation_bn text)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); prem boolean;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then return; end if;
  if array_length(p_ids, 1) > 50 then raise exception 'too_many'; end if;
  if not public.rate_ok('answer_keys', 60, interval '1 hour') then raise exception 'rate_limited'; end if;
  prem := public.has_premium(uid);
  return query
    select q.id, q.correct_option::smallint, q.explanation_en, q.explanation_bn
    from public.questions q
    where q.id = any(p_ids) and q.is_active and (not q.is_premium or prem);
end $$;
revoke all on function public.answer_keys(bigint[]) from public, anon;
grant execute on function public.answer_keys(bigint[]) to authenticated;
