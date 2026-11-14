-- One model test is free for everyone, so a new visitor can judge the quality before buying.
-- It is built from the 300 free questions (a non-premium member only ever gets free questions in a free test):
-- 50 questions in the PSC proportions, 30 minutes. It can be taken any number of times.

-- The weekly leaderboard is for the premium model-test series: the free test must not count there.
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'weekly_leaderboard';
  if d not like '%t.blueprint is not null and t.is_premium and%' then
    d := replace(d, 't.blueprint is not null and', 't.blueprint is not null and t.is_premium and');
    execute d;
  end if;
end $$;

insert into public.mock_tests (title_en, title_bn, description_en, description_bn, question_count, duration_minutes,
                               marks_per_question, negative_mark, is_premium, blueprint, sort_order)
select 'Free model test', 'ফ্রি মডেল টেস্ট',
       'A 50-question test made from the 300 free questions. Take it as many times as you like, but the questions come from those same 300 again and again. Premium gives you 11,000+ questions, every full 100-question model test and detailed result analysis.',
       'ফ্রি ৩০০ প্রশ্ন থেকে তৈরি ৫০ প্রশ্নের টেস্ট। যতবার ইচ্ছা দিতে পারবেন, তবে প্রশ্ন ওই ৩০০টির মধ্য থেকেই ঘুরেফিরে আসবে। প্রিমিয়ামে পাবেন ১১,০০০+ প্রশ্ন, ১০০ প্রশ্নের সব পূর্ণ মডেল টেস্ট ও বিস্তারিত ফলাফল বিশ্লেষণ।',
       50, 30, 1, 0.5, false, '{"bangla": 10, "english": 10, "gk": 10, "nursing": 20}'::jsonb, 1
where not exists (select 1 from public.mock_tests where title_en = 'Free model test');
