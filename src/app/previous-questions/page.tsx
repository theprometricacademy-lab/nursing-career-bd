'use client';
import { Suspense } from 'react';
import { Timer, Crown, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { QuestionBrowser } from '@/components/QuestionBrowser';
import { PageHeader, useExams } from '@/components/ui';
import { useStartExam } from '@/components/useStartExam';

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** '2026-08-03' → 'পরীক্ষা: ৩ আগস্ট ২০২৬' (plain string parse, no timezone shift) */
function examDate(iso: string, lang: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (lang !== 'bn') return `Exam: ${d} ${EN_MONTHS[m - 1]} ${y}`;
  const bn = (n: number) => String(n).replace(/\d/g, (c) => BN_DIGITS[+c]);
  return `পরীক্ষা: ${bn(d)} ${BN_MONTHS[m - 1]} ${bn(y)}`;
}

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
          {/* newest exam first, one under another */}
          <div className="flex flex-col gap-3">
            {exams.map((e) => (
              <div key={e.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug text-ink">{pick(e, 'name')}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {e.exam_date ? examDate(e.exam_date, lang) : num(e.year)}
                  </div>
                </div>
                <button className="btn-success w-full shrink-0 !py-2 sm:w-44" disabled={!!busy} onClick={() => start({ mode: 'pyq', exam: e.id }, `e${e.id}`)}>
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
