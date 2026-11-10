-- Nursing Career BD — core schema
-- Design rule: students NEVER read the `questions` table directly.
-- They only get question text through SECURITY DEFINER functions that strip
-- the correct answer until it is safe to reveal (practice check or after submit).

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'student' check (role in ('student','admin')),
  language text not null default 'bn' check (language in ('bn','en')),
  created_at timestamptz not null default now()
);

-- ---------- Catalogue ----------
create table public.subjects (
  id serial primary key,
  slug text unique not null,
  name_en text not null,
  name_bn text not null,
  category text not null check (category in ('nursing','general')),
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.topics (
  id serial primary key,
  subject_id int not null references public.subjects(id) on delete cascade,
  name_en text not null,
  name_bn text not null,
  unique (subject_id, name_en)
);

-- Previous recruitment exams (sources of PYQ)
create table public.exams (
  id serial primary key,
  name_en text not null,
  name_bn text not null,
  exam_type text not null default 'senior_staff_nurse'
    check (exam_type in ('senior_staff_nurse','bsc_nursing','diploma_nursing','other')),
  year int not null,
  is_active boolean not null default true,
  unique (name_en, year)
);

create table public.questions (
  id bigserial primary key,
  code text unique not null,                       -- human ID, e.g. NCB-000123
  subject_id int not null references public.subjects(id),
  topic_id int references public.topics(id) on delete set null,
  exam_id int references public.exams(id) on delete set null,
  question_en text not null,
  question_bn text not null,
  options_en text[] not null check (array_length(options_en,1) = 4),
  options_bn text[] not null check (array_length(options_bn,1) = 4),
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation_en text,
  explanation_bn text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  is_premium boolean not null default false,
  source text,
  year int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.questions (subject_id) where is_active;
create index on public.questions (exam_id) where is_active;
create index on public.questions (topic_id);
create sequence public.question_code_seq;
create or replace function public.set_question_code() returns trigger language plpgsql set search_path = public as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'NCB-' || lpad(nextval('public.question_code_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger questions_code before insert or update on public.questions
  for each row execute function public.set_question_code();

-- ---------- Mock tests ----------
create table public.mock_tests (
  id serial primary key,
  title_en text not null,
  title_bn text not null,
  description_en text,
  description_bn text,
  question_count int not null default 50 check (question_count between 1 and 300),
  duration_minutes int not null default 50 check (duration_minutes between 1 and 600),
  marks_per_question numeric(5,2) not null default 1,
  negative_mark numeric(5,2) not null default 0.25,
  subject_ids int[],               -- null = all subjects
  exam_id int references public.exams(id) on delete set null, -- set = previous exam mock
  is_premium boolean not null default false,
  price numeric(10,2),             -- single purchase price (null = use default)
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Attempts & answers ----------
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_test_id int references public.mock_tests(id) on delete set null,
  mode text not null check (mode in ('mock','daily','pyq','custom')),
  title_en text, title_bn text,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  marks_per_question numeric(5,2) not null default 1,
  negative_mark numeric(5,2) not null default 0,
  total_questions int not null default 0,
  correct int, wrong int, skipped int,
  score numeric(8,2), max_score numeric(8,2)
);
create index on public.test_attempts (user_id, started_at desc);

create table public.attempt_answers (
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  position int not null,
  question_id bigint not null references public.questions(id) on delete cascade,
  option_order smallint[] not null,   -- display order of original option indexes
  selected_option smallint check (selected_option between 0 and 3), -- original index
  is_marked boolean not null default false,
  is_correct boolean,                  -- filled only on submit
  primary key (attempt_id, position)
);

-- Per-user, per-question learning record (drives wrong-answer practice & stats)
create table public.user_question_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  attempts int not null default 0,
  correct_count int not null default 0,
  last_correct boolean,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ---------- Commerce ----------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id serial primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  value numeric(10,2) not null check (value > 0),
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('lifetime','single_test')),
  mock_test_id int references public.mock_tests(id) on delete set null,
  amount numeric(10,2) not null,
  original_amount numeric(10,2) not null,
  coupon_id int references public.coupons(id) on delete set null,
  gateway text not null check (gateway in ('bkash','nagad','sslcommerz','manual')),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  gateway_ref text,          -- gateway's payment/session id
  gateway_txn_id text,       -- final transaction id after verification
  gateway_payload jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create unique index payments_txn_unique on public.payments (gateway, gateway_txn_id) where gateway_txn_id is not null;
create index on public.payments (user_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('lifetime','single_test')),
  mock_test_id int references public.mock_tests(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  status text not null default 'active' check (status in ('active','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,       -- null = never expires
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.subscriptions (user_id) where status = 'active';

-- ---------- Notices / notifications ----------
create table public.notices (
  id serial primary key,
  title_en text not null,
  title_bn text not null,
  body_en text,
  body_bn text,
  is_published boolean not null default true,
  published_at timestamptz not null default now()
);

-- Simple DB-side rate limiting bucket
create table public.rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, action, window_start)
);
