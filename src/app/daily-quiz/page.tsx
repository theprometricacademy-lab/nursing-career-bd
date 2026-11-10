'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Play, Trophy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader } from '@/components/ui';
import { useStartExam } from '@/components/useStartExam';

type Attempt = { id: string; status: string; score: number | null; max_score: number | null; started_at: string };

export default function DailyQuizPage() {
  const { t, num, lang, user } = useApp();
  const { start, busy, err } = useStartExam();
  const [today, setToday] = useState<Attempt[]>([]);

  useEffect(() => {
    if (!user) return;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    supabaseBrowser().from('test_attempts').select('id, status, score, max_score, started_at')
      .eq('user_id', user.id).eq('mode', 'daily').gte('started_at', since.toISOString()).order('started_at', { ascending: false })
      .then(({ data }) => setToday((data as Attempt[]) ?? []));
  }, [user]);

  const dateStr = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('dailyQuiz')} sub={dateStr} />
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-mint-400 to-mint-600 p-6 text-white">
          <CalendarCheck className="h-10 w-10" />
          <h2 className="mt-3 text-xl font-bold">{lang === 'bn' ? 'আজকের কুইজ' : "Today's quiz"}</h2>
          <p className="text-sm text-mint-50">{num(10)} {t('questions')} · {num(10)} {t('minutes')}</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-ink-soft">
            {lang === 'bn' ? 'প্রতিদিন নতুন ১০টি প্রশ্ন। সবার জন্য একই প্রশ্ন, তাই বন্ধুদের সাথে নম্বর মিলিয়ে নিন!' : 'Ten new questions every day — the same set for everyone, so compare scores with friends!'}
          </p>
          <button className="btn-success mt-4 w-full" disabled={!!busy} onClick={() => start({ mode: 'daily' })}>
            <Play className="h-4 w-4" />{busy ? t('loading') : t('startNow')}
          </button>
          {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        </div>
      </div>
      {today.length > 0 && (
        <div className="card mt-4 p-4">
          <h3 className="mb-2 font-semibold text-ink">{lang === 'bn' ? 'আজকের চেষ্টা' : "Today's attempts"}</h3>
          <ul className="divide-y divide-brand-100">
            {today.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-blush-600" />
                  {a.status === 'submitted' ? `${num(a.score ?? 0)} / ${num(a.max_score ?? 0)}` : t('inProgress')}
                </span>
                <Link className="text-brand-700 hover:underline" href={a.status === 'submitted' ? `/result/${a.id}` : `/exam/${a.id}`}>
                  {a.status === 'submitted' ? t('view') : t('resume')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
