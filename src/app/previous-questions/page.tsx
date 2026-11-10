'use client';
import { Suspense } from 'react';
import { Timer, Crown } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { QuestionBrowser } from '@/components/QuestionBrowser';
import { PageHeader, useExams } from '@/components/ui';
import { useStartExam } from '@/components/useStartExam';

export default function PreviousQuestionsPage() {
  const { t, pick, num, lang, premium } = useApp();
  const exams = useExams();
  const { start, busy, err } = useStartExam();

  return (
    <div>
      <PageHeader title={t('previousYear')} sub={t('featurePyqD')} />
      {exams.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">{lang === 'bn' ? 'পরীক্ষা মোডে দিন' : 'Take in exam mode'}</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {exams.map((e) => (
              <div key={e.id} className="card min-w-[240px] p-4">
                <div className="text-sm font-semibold text-ink">{pick(e, 'name')}</div>
                <div className="text-xs text-ink-soft">{num(e.year)}</div>
                <button className="btn-success mt-3 w-full !py-2" disabled={!!busy} onClick={() => start({ mode: 'pyq', exam: e.id }, `e${e.id}`)}>
                  <Timer className="h-4 w-4" />{busy === `e${e.id}` ? t('loading') : t('startNow')}
                </button>
              </div>
            ))}
          </div>
          {!premium && (
            <p className="mt-2 flex items-center gap-2 text-xs text-blush-700">
              <Crown className="h-4 w-4" />
              {lang === 'bn' ? 'ফ্রি অ্যাকাউন্টে শুধু ফ্রি প্রশ্নগুলো আসবে।' : 'Free accounts get the free questions only.'}
              <Link href="/premium" className="font-semibold underline">{t('upgrade')}</Link>
            </p>
          )}
          {err && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        </div>
      )}
      <Suspense><QuestionBrowser showExamFilters /></Suspense>
    </div>
  );
}
