-- Exam date so previous-year papers can be listed newest first
alter table public.exams add column if not exists exam_date date;
