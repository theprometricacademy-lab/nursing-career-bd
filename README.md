# Nursing Career BD

**Smart Preparation for Nursing Jobs in Bangladesh** — বাংলাদেশে নার্সিং চাকরির স্মার্ট প্রস্তুতি

Bilingual (বাংলা / English) exam-preparation platform for BSc Nursing, Diploma in Nursing Science & Midwifery
and Senior Staff Nurse recruitment exams.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) · Vercel.

## Features
- Question bank (20 subjects), every question in Bangla & English with explanations
- Practice mode with instant answer check, bookmarks and wrong-answer practice
- Real exam simulator: timer synced to the server, palette, mark for review, auto-submit, negative marking
- Previous-year questions with exam / year / subject filters and exam mode
- Daily quiz (same 10 questions for everyone each day)
- Student dashboard: tests, accuracy, best/average score, subject-wise performance, history
- Premium: lifetime plan + single mock test purchase, coupons, bKash / Nagad / SSLCommerz
- Admin panel at `/admin`: questions CRUD, CSV/Excel bulk import, subjects/topics/exams, mock tests,
  users & premium, payments & refunds, coupons, notices, prices & gateway switches, analytics

## Security model
- Students can **never** read the `questions` table. All question text comes through
  `SECURITY DEFINER` functions (`supabase/migrations/0003_exam_engine.sql`) that strip the correct answer.
- Correct answers are revealed only by `check_answer` (after the student answers, practice mode) or by
  `get_attempt` once an attempt is **submitted**.
- Scores are calculated in the database (`finalize_attempt`). Time limits are enforced server-side.
- Premium is granted only by `grant_payment`, which only the server's service-role key can call, after the
  gateway confirms the payment server-to-server (bKash execute + status, Nagad verify, SSLCommerz validator / IPN)
  and the amount matches.
- Row Level Security on every table; admins are checked with `is_admin()`; DB-side rate limits on exam actions.

## Setup
1. Apply the SQL in `supabase/migrations` in order (already applied on the project `pnbuydaeooxjojkzjdby`).
2. Copy `.env.example` → `.env.local` and fill in the keys (or set them in Vercel → Settings → Environment Variables).
3. `npm install && npm run dev`
4. Sign up, then make yourself admin in Supabase SQL editor:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
5. In Supabase → Authentication → URL Configuration set **Site URL** to your domain and add
   `https://your-domain/auth/callback` to Redirect URLs.

## Bulk import format
Download the template from **Admin → Bulk import**. Columns:
`code, subject, topic_en, topic_bn, question_en, question_bn, option_a_en … option_d_en, option_a_bn … option_d_bn,
correct, explanation_en, explanation_bn, difficulty, is_premium, source, year, exam`
