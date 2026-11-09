-- Match the real recruitment exam:
--  * each subject has the language its questions appear in on the real paper (exam_lang)
--  * Bangla & English subject questions are not translated (translatable = false)
--  * mock tests can follow a section blueprint (Bangla / English / GK / Nursing)
--  * default negative mark 0.50

alter table public.subjects
  add column exam_lang text not null default 'en' check (exam_lang in ('bn','en')),
  add column translatable boolean not null default true;

update public.subjects set exam_lang = 'bn' where category = 'general';
update public.subjects set exam_lang = 'en' where slug in ('english','ict');
update public.subjects set translatable = false where slug in ('bangla','english');

-- per-question override (null = use the subject's)
alter table public.questions add column exam_lang text check (exam_lang in ('bn','en'));

-- blueprint: {"bangla":20,"english":20,"gk":20,"nursing":40}
alter table public.mock_tests add column blueprint jsonb;
alter table public.mock_tests alter column negative_mark set default 0.5;

update public.app_settings set value = '0.5' where key = 'default_negative_mark';
update public.mock_tests set negative_mark = 0.5;
update public.mock_tests
   set blueprint = '{"bangla":20,"english":20,"gk":20,"nursing":40}', question_count = 100, duration_minutes = 60
 where title_en = 'Senior Staff Nurse Model Test 1';

-- section of a subject inside the blueprint
create or replace function public.subject_section(s public.subjects) returns text
language sql immutable set search_path = public as $$
  select case when s.slug = 'bangla' then 'bangla'
              when s.slug = 'english' then 'english'
              when s.category = 'nursing' then 'nursing'
              else 'gk' end;
$$;
