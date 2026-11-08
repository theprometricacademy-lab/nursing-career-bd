'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Timer, History, BarChart3, CalendarCheck, ArrowRight, Megaphone, GraduationCap } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { useSubjects } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase/client';

type Notice = { id: number; title_en: string; title_bn: string; body_en: string | null; body_bn: string | null; published_at: string };

export default function HomePage() {
  const { t, pick, user, num } = useApp();
  const subjects = useSubjects();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    supabaseBrowser().from('notices').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(3)
      .then(({ data }) => setNotices((data as Notice[]) ?? []));
  }, []);

  const features = [
    { icon: BookOpen, title: t('featureBank'), d: t('featureBankD'), href: '/question-bank', tone: 'bg-brand-50 text-brand-700' },
    { icon: Timer, title: t('featureMock'), d: t('featureMockD'), href: '/mock-tests', tone: 'bg-mint-50 text-mint-700' },
    { icon: History, title: t('featurePyq'), d: t('featurePyqD'), href: '/previous-questions', tone: 'bg-blush-50 text-blush-700' },
    { icon: BarChart3, title: t('featureTrack'), d: t('featureTrackD'), href: '/dashboard', tone: 'bg-brand-50 text-brand-700' },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 text-white md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blush-400/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-mint-300/30 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="chip bg-white/15 text-white">{t('tagline')}</span>
          <h1 className="mt-3 text-2xl font-bold leading-snug md:text-4xl">{t('heroTitle')}</h1>
          <p className="mt-3 text-sm text-brand-50 md:text-base">{t('heroSub')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={user ? '/mock-tests' : '/signup'} className="btn bg-mint-400 text-ink hover:bg-mint-300">
              {user ? t('startNow') : t('getStarted')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/question-bank" className="btn border border-white/40 bg-white/10 text-white hover:bg-white/20">{t('exploreQuestions')}</Link>
          </div>
        </div>
      </section>

      <Link href="/daily-quiz" className="card flex items-center gap-4 border-mint-200 bg-gradient-to-r from-mint-50 to-white p-4 transition hover:shadow-md">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-500 text-white"><CalendarCheck className="h-6 w-6" /></span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{t('dailyQuiz')}</div>
          <div className="text-sm text-ink-soft">{num(10)} {t('questions')} · {num(10)} {t('minutes')}</div>
        </div>
        <ArrowRight className="h-5 w-5 text-mint-600" />
      </Link>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {features.map(({ icon: Icon, title, d, href, tone }) => (
          <Link key={href} href={href} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            <h3 className="mt-3 font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-ink-soft">{d}</p>
          </Link>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><GraduationCap className="h-5 w-5 text-brand-600" />{t('examsCovered')}</h2>
        <div className="flex flex-wrap gap-2">
          {(['bscExam', 'diplomaExam', 'ssnExam', 'otherExam'] as const).map((k, i) => (
            <span key={k} className={`chip py-1.5 text-sm ${['bg-brand-100 text-brand-800', 'bg-mint-100 text-mint-700', 'bg-blush-100 text-blush-700', 'bg-brand-50 text-brand-700'][i]}`}>{t(k)}</span>
          ))}
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {(['nursing', 'general'] as const).map((cat) => (
            <div key={cat} className="card p-5">
              <h2 className="mb-3 font-semibold text-ink">{cat === 'nursing' ? t('nursingSubjects') : t('generalSubjects')}</h2>
              <div className="flex flex-wrap gap-2">
                {subjects.filter((s) => s.category === cat).map((s) => (
                  <Link key={s.id} href={`/question-bank?subject=${s.id}`}
                    className={`chip py-1.5 text-sm transition ${cat === 'nursing' ? 'bg-brand-50 text-brand-800 hover:bg-brand-100' : 'bg-mint-50 text-mint-700 hover:bg-mint-100'}`}>
                    {pick(s, 'name')}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {notices.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Megaphone className="h-5 w-5 text-blush-600" />{t('notices')}</h2>
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n.id} className="rounded-xl bg-blush-50/60 p-3">
                <div className="font-medium text-ink">{pick(n, 'title')}</div>
                {pick(n, 'body') && <p className="mt-1 text-sm text-ink-soft">{pick(n, 'body')}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
