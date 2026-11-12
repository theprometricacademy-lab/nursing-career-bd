'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Empty, PageHeader, Spinner } from '@/components/ui';

type Row = {
  id: string; mode: string; title_en: string | null; title_bn: string | null; status: string; started_at: string;
  score: number | null; max_score: number | null; correct: number | null; wrong: number | null; skipped: number | null;
};

export default function ResultsPage() {
  const { t, num, pick, lang, user } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from('test_attempts')
      .select('id, mode, title_en, title_bn, status, started_at, score, max_score, correct, wrong, skipped')
      .eq('user_id', user.id).order('started_at', { ascending: false }).limit(100)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [user]);

  const done = useMemo(() => (rows ?? []).filter((r) => r.status === 'submitted' && Number(r.max_score) > 0), [rows]);
  // last 12 results, oldest → newest, for a simple trend chart
  const trend = useMemo(() => done.slice(0, 12).reverse().map((r) => Math.round((Number(r.score) / Number(r.max_score)) * 100)), [done]);

  if (!rows) return <Spinner />;
  const modeLabel = (m: string) => ({ mock: t('mockTest'), daily: t('dailyQuiz'), pyq: t('previousYear'), custom: t('practiceTest'), weekly: t('weeklyTest') }[m] ?? m);

  return (
    <div className="space-y-4">
      <PageHeader title={t('results')} />
      {rows.length === 0 ? <Empty action={<Link href="/mock-tests" className="btn-success">{t('startNow')}</Link>} /> : (
        <>
          {trend.length > 1 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-ink">{lang === 'bn' ? 'নম্বরের ধারা (%)' : 'Score trend (%)'}</h2>
              <div className="flex h-40 items-end gap-2">
                {trend.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-ink-soft">{num(Math.max(v, 0))}</span>
                    <div className={`w-full rounded-t-lg ${v >= 70 ? 'bg-mint-400' : v >= 40 ? 'bg-brand-400' : 'bg-blush-400'}`}
                      style={{ height: `${Math.max(4, Math.max(v, 0))}%` }} />
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 font-semibold text-ink">{t('testHistory')}</h2>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full text-sm">
                <thead className="bg-brand-50 text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-4 py-2">{t('exam')}</th>
                    <th className="px-4 py-2">{t('score')}</th>
                    <th className="hidden px-4 py-2 sm:table-cell">{t('correctCount')}/{t('wrongCount')}/{t('skipped')}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{pick(r, 'title') || modeLabel(r.mode)}</div>
                        <div className="text-xs text-ink-soft">{modeLabel(r.mode)} · {new Date(r.started_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{r.status === 'submitted' ? `${num(Number(r.score))}/${num(Number(r.max_score))}` : <span className="chip bg-blush-100 text-blush-700">{t('inProgress')}</span>}</td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">{r.status === 'submitted' && `${num(r.correct ?? 0)} / ${num(r.wrong ?? 0)} / ${num(r.skipped ?? 0)}`}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link className="text-brand-700 hover:underline" href={r.status === 'submitted' ? `/result/${r.id}` : `/exam/${r.id}`}>
                          {r.status === 'submitted' ? t('view') : t('resume')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
