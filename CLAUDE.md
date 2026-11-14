# Nursing Career BD — working notes for Claude

This repository is public. Never commit secrets, personal data or business figures here.

## Project

- Site: nursingcareerbd.com. Next.js 15 on Cloudflare Workers through OpenNext. Database and auth: Supabase.
- Always reply to the owner in Bangla. The owner works from an iPhone only (no computer).
- A second Claude session also pushes to `main`: always `git pull --rebase` before committing.

## Standing rules

- Never show secrets (service role key, API keys, passwords, tokens, VAPID private key, notify secret) in chat.
  The owner enters secrets in dashboards himself.
- Spending money (ads, plans, domains) needs the owner's explicit confirmation of amount and duration first.
- Never put DELETE / UPDATE / DROP in batch SQL. Targeted fixes go in their own statement; permanent deletions need
  confirmation. Function bodies may of course contain UPDATE.
- prometric.online is a separate project: do not touch it.
- Do not modify `exam_id` 5.
- Content: no Sheikh Mujib / Bangabandhu / Sheikh Hasina content. Questions use source 'Nursing Career BD' and have
  exactly one correct option. The Circulars section is government jobs only; private hospital jobs are a separate section.
- No fake scarcity or fake social proof.
- Claude cannot create accounts or type passwords for the owner.

## Release process

1. Type-check on GitHub Actions (there is no local Node toolchain with network):
   `git checkout -B cicheck-tmp && git checkout faa05f9 -- .github/workflows/ci-check.yml && git add -A && git commit -m "ci check" && git push -f origin cicheck-tmp:ci-check`,
   wait for the run on branch `ci-check`, then grep its log for `error TS|Type error|Failed to compile`.
2. Deploy: `git checkout main && git pull --rebase`, bring the changed files over with
   `git checkout cicheck-tmp -- <files>` (never the workflow file), commit, `git push origin main`.
3. Poll `gh api repos/theprometricacademy-lab/nursing-career-bd/commits/<sha>/check-runs` until "Workers Builds" is
   `success`. A transient build failure is fixed by pushing an empty commit.
4. Database changes: write `supabase/migrations/NNNN_name.sql`, apply the same SQL with the Supabase tool, and make the
   change additive so the old client keeps working until the new build is live.

GitHub GraphQL is not available here: use `gh api` REST calls. The branches `ci-check`, `promo-out`, `video-src`,
`video-asr` and `cardshot-out` are scratch branches that cannot be deleted from a session.

## Things that are easy to get wrong

- The admin pages need the owner's login, so Claude cannot open them: say so and ask for a screenshot.
- Visitor tracking: `src/components/Tracker.tsx` records a view only when the page is actually visible.
  `page_views.referrer` holds the source label (`fb_ad`, `facebook`, …), taken from `utm_source` on the first page.
- Admin lists are RPCs guarded by `is_admin()` (`admin_visitors`, `admin_test_attempts`, `admin_premium_users`,
  `admin_list_users`, `admin_usage`, `admin_notification_log`).
- Notifications: inserting into `notifications` calls the Edge Function `notify` (supabase/functions/notify) through
  pg_net. Emails go through `email_queue` with a daily cap from `app_settings.notify_email` (`daily_cap`, `weekly`);
  cron job `email-queue-drain` sends the rest next morning. The free email plan allows 100 emails a day.
- Email confirmation on sign-up is off: a new account is logged in at once.
- Meta Pixel (`src/components/MetaPixel.tsx`) sends PageView, CompleteRegistration, WeeklyTestStart, InitiateCheckout
  and Purchase; it is skipped on /admin and for automated browsers.
- The Android app is an APK downloaded from the site (`src/components/InstallApp.tsx`), not a Play Store app.
- `Stat` in `src/components/ui.tsx` takes an optional `href` to make a card a link.
