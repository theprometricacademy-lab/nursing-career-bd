'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ListChecks, CheckCircle2, Percent, Trophy, Bookmark, RotateCcw, Crown, ArrowRight } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Progress, Spinner, Stat } from '@/components/ui';
import { ReviewForm } from '@/components/Reviews';

type MyStats = {
  tests_completed: number; questions_attempted: number; correct_answers: number; unique_questions: number; total_questions: number;
  average_percent: number | null; best_percent: number | null; bookmarks: number; wrong_questions: number; premium: boolean;
  subjects: { subject_id: number; name_en: string; name_bn: string; attempts: number; correct: number }[];
  recent: { id: string; mode: string; title_en: string; title_bn: string; status: string; started_at: string; score: number | null; max_score: number | null; total_questions: number }[];
};

function useMyStats() {
  const [s, setS] = useState<MyStats | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabaseBrowser().rpc('my_stats').then(({ data, error }) => (error ? setErr(error.message) : setS(data as MyStats)));
  }, []);
  return { s, err };
}

export default function DashboardPage() {
  const { t, num, pick, profile, user, lang } = useApp();
  const { s, err } = useMyStats();

  if (err) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{err}</p>;
  if (!s) return <Spinner />;

  const coverage = s.total_questions ? Math.round((s.unique_questions / s.total_questions) * 100) : 0;
  const name = profile?.full_name || user?.email?.split('@')[0] || '';
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4">
      <PageHeader title={`${t('welcome')}, ${name}`} sub={t('tagline')}
        right={s.premium
          ? <span className="chip bg-blush-100 py-1.5 text-sm text-blush-700"><Crown className="h-4 w-4" />{t('premium')}: {t('active')}</span>
          : <Link href="/premium" className="btn-pink"><Crown className="h-4 w-4" />{t('upgrade')}</Link>} />

      {s.premium && <ReviewForm />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={t('testsCompleted')} value={num(s.tests_completed)} icon={<ClipboardCheck className="h-5 w-5" />} />
        <Stat label={t('questionsAttempted')} value={num(s.questions_attempted)} icon={<ListChecks className="h-5 w-5" />} />
        <Stat label={t('correctAnswers')} value={num(s.correct_answers)} tone="mint" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat label={t('averageScore')} value={s.average_percent === null ? '—' : `${num(s.average_percent)}%`} icon={<Percent className="h-5 w-5" />} />
        <Stat label={t('bestScore')} value={s.best_percent === null ? '—' : `${num(s.best_percent)}%`} tone="mint" icon={<Trophy className="h-5 w-5" />} />
        <Stat label={t('premiumStatus')} value={s.premium ? t('active') : t('inactive')} tone="blush" icon={<Crown className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">{t('learningProgress')}</h2>
          <p className="mb-3 text-sm text-ink-soft">{num(s.unique_questions)}/{num(s.total_questions)} — {num(coverage)}% {t('coverage')}</p>
          <Progress value={coverage} tone="mint" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/bookmarks" className="flex items-center gap-2 rounded-xl bg-blush-50 p-3 text-sm text-blush-700 hover:bg-blush-100">
              <Bookmark className="h-4 w-4" />{t('bookmarks')}: <b>{num(s.bookmarks)}</b>
            </Link>
            <Link href="/wrong-answers" className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 hover:bg-brand-100">
              <RotateCcw className="h-4 w-4" />{t('wrongCount')}: <b>{num(s.wrong_questions)}</b>
            </Link>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">{t('subjectPerformance')}</h2>
          {s.subjects.length === 0 ? <p className="text-sm text-ink-soft">{t('noData')}</p> : (
            <div className="space-y-3">
              {s.subjects.map((x) => {
                const pct = x.attempts ? Math.round((x.correct / x.attempts) * 100) : 0;
                return (
                  <div key={x.subject_id}>
                    <div className="mb-1 flex justify-between text-sm"><span>{pick(x, 'name')}</span><span className="text-ink-soft">{num(pct)}%</span></div>
                    <Progress value={pct} tone={pct >= 70 ? 'mint' : pct >= 40 ? 'brand' : 'blush'} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">{t('recentActivity')}</h2>
          <Link href="/results" className="text-sm text-brand-700 hover:underline">{t('view')} <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {s.recent.length === 0 ? (
          <div className="text-sm text-ink-soft">{t('noData')} <Link href="/mock-tests" className="font-semibold text-mint-700 underline">{t('startNow')}</Link></div>
        ) : (
          <ul className="divide-y divide-brand-100">
            {s.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs text-ink-soft">{date(r.started_at)}</span>
                <span className="min-w-0 flex-1 truncate">{pick(r, 'title')}</span>
                {r.status === 'submitted'
                  ? <Link href={`/result/${r.id}`} className="font-semibold text-brand-700">{num(Number(r.score))}/{num(Number(r.max_score))}</Link>
                  : <Link href={`/exam/${r.id}`} className="chip bg-blush-100 text-blush-700">{t('resume')}</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
