'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Timer, ListChecks, MinusCircle, Crown, Play, Trophy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Empty, PageHeader, PremiumChip, Spinner } from '@/components/ui';
import { useStartExam } from '@/components/useStartExam';
import { useCached, sbData } from '@/lib/cache';

type MockTest = {
  id: number; title_en: string; title_bn: string; description_en: string | null; description_bn: string | null;
  question_count: number; duration_minutes: number; marks_per_question: number; negative_mark: number;
  is_premium: boolean; price: number | null; exam_id: number | null;
  blueprint: { bangla?: number; english?: number; gk?: number; nursing?: number } | null;
};

export default function MockTestsPage() {
  const { t, pick, num, premium, user, lang } = useApp();
  const tests = useCached<MockTest[]>('mock_tests', () => sbData(supabaseBrowser().from('mock_tests').select('*').eq('is_published', true).order('sort_order').order('id'))) ?? null;
  const [owned, setOwned] = useState<Set<number>>(new Set());
  const { start, busy, err } = useStartExam();

  useEffect(() => {
    const sb = supabaseBrowser();
    if (user) {
      sb.from('subscriptions').select('mock_test_id').eq('user_id', user.id).eq('plan', 'single_test').eq('status', 'active')
        .then(({ data }) => setOwned(new Set((data ?? []).map((r: { mock_test_id: number }) => r.mock_test_id))));
    }
  }, [user]);

  return (
    <div>
      <PageHeader title={t('mockTests')} sub={t('featureMockD')} />
      <div className="card mb-4 border-brand-200 bg-brand-50/60 p-4 text-sm text-ink">
        <b>{t('instructions')}:</b>
        <ul className="ml-5 mt-1 list-disc space-y-0.5 text-ink-soft">
          <li>{t('instr1')}</li><li>{t('instr2')}</li><li>{t('instr3')}</li>
        </ul>
      </div>
      <Link href="/leaderboard" className="gold-card mb-4 flex items-center gap-4 p-4 transition hover:brightness-110">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-gold-900"><Trophy className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-bold"><span className="gold-text">{lang === 'bn' ? 'সাপ্তাহিক মেধাতালিকা' : 'Weekly leaderboard'}</span></span>
          <span className="block text-sm text-white/80">{lang === 'bn' ? 'প্রিমিয়াম মডেল টেস্ট সিরিজ (১–১০) দিন, প্রতি সপ্তাহের সেরা ২০ জনের তালিকায় নাম তুলুন।' : 'Take the premium model test series (1–10) and get into this week’s top 20.'}</span>
        </span>
        <span className="text-gold-300">→</span>
      </Link>
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!tests ? <Spinner /> : tests.length === 0 ? <Empty /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {tests.map((m) => {
            const canTake = !m.is_premium || premium || owned.has(m.id);
            const bp = m.blueprint && !m.exam_id ? m.blueprint : null;
            const qCount = bp ? (bp.bangla ?? 0) + (bp.english ?? 0) + (bp.gk ?? 0) + (bp.nursing ?? 0) : m.question_count;
            return (
              <div key={m.id} className={`card flex flex-col p-4 ${m.is_premium ? 'border-blush-200' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{pick(m, 'title')}</h3>
                  {m.is_premium ? <PremiumChip /> : <span className="chip bg-mint-100 text-mint-700">{t('free')}</span>}
                </div>
                {pick(m, 'description') && (m.is_premium
                  ? <p className="mt-1 text-sm text-ink-soft">{pick(m, 'description')}</p>
                  : (
                    <div className="mt-2 rounded-xl bg-mint-50 p-3 text-sm leading-relaxed text-ink">
                      {pick(m, 'description')}
                      {!premium && <Link href="/premium" className="mt-1 block font-semibold text-blush-700 underline">{lang === 'bn' ? 'প্রিমিয়ামে কী কী বেশি পাবেন দেখুন' : 'See what Premium adds'}</Link>}
                    </div>
                  ))}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft">
                  <span className="flex items-center gap-1"><ListChecks className="h-4 w-4 text-brand-600" />{num(qCount)} {t('questions')}</span>
                  <span className="flex items-center gap-1"><Timer className="h-4 w-4 text-brand-600" />{num(m.duration_minutes)} {t('minutes')}</span>
                  {Number(m.negative_mark) > 0 && (
                    <span className="flex items-center gap-1"><MinusCircle className="h-4 w-4 text-blush-600" />{t('negativeMarking')}: {num(m.negative_mark)}</span>
                  )}
                </div>
                {bp && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {([['bangla', 'secBangla', 'bg-blush-50 text-blush-700'], ['english', 'secEnglish', 'bg-brand-50 text-brand-700'], ['gk', 'secGk', 'bg-mint-50 text-mint-700'], ['nursing', 'secNursing', 'bg-brand-100 text-brand-800']] as const)
                      .filter(([k]) => (bp[k] ?? 0) > 0)
                      .map(([k, label, cls]) => <span key={k} className={`chip ${cls}`}>{t(label)} {num(bp[k] ?? 0)}</span>)}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  {canTake ? (
                    <button className="btn-success flex-1" disabled={!!busy} onClick={() => start({ mode: 'mock', mockTest: m.id }, `m${m.id}`)}>
                      <Play className="h-4 w-4" />{busy === `m${m.id}` ? t('loading') : t('startNow')}
                    </button>
                  ) : (
                    <>
                      <Link href={`/premium?test=${m.id}`} className="btn-ghost flex-1">{t('buyTest')}</Link>
                      <Link href="/premium" className="btn-pink flex-1"><Crown className="h-4 w-4" />{t('upgrade')}</Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
