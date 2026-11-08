'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, MinusCircle, Trophy, AlarmClock, RotateCcw } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Progress, Spinner, Stat } from '@/components/ui';
import { LETTERS, type Attempt } from '@/components/examTypes';

export default function ResultPage() {
  return <Suspense><ResultView /></Suspense>;
}

function ResultView() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { t, lang, num, pick } = useApp();
  const [a, setA] = useState<Attempt | null>(null);
  const [err, setErr] = useState('');
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    supabaseBrowser().rpc('get_attempt', { p_attempt: id }).then(({ data, error }) => {
      if (error) setErr(error.message); else setA(data as Attempt);
    });
  }, [id]);

  const percent = useMemo(() => (a && a.max_score ? Math.round((Number(a.score) / Number(a.max_score)) * 1000) / 10 : 0), [a]);
  if (err) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{err}</p>;
  if (!a) return <Spinner />;
  if (a.status !== 'submitted') {
    return <div className="card p-6 text-center"><p>{t('inProgress')}</p><Link className="btn-primary mt-3" href={`/exam/${id}`}>{t('resume')}</Link></div>;
  }

  const answered = (a.correct ?? 0) + (a.wrong ?? 0);
  const accuracy = answered ? Math.round(((a.correct ?? 0) / answered) * 100) : 0;
  const letters = LETTERS[lang];
  const list = a.questions.filter((q) => !onlyWrong || q.is_correct !== true);
  const tone = percent >= 70 ? 'from-mint-400 to-mint-600' : percent >= 40 ? 'from-brand-400 to-brand-600' : 'from-blush-400 to-blush-600';

  return (
    <div className="space-y-4">
      {search.get('auto') && (
        <p className="flex items-center gap-2 rounded-xl bg-blush-50 p-3 text-sm text-blush-700"><AlarmClock className="h-4 w-4" />{t('timeUp')}</p>
      )}
      <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-6 text-white`}>
        <div className="flex items-center gap-2 text-sm opacity-90"><Trophy className="h-4 w-4" />{pick(a, 'title')}</div>
        <div className="mt-2 text-4xl font-bold">{num(Number(a.score))}<span className="text-xl opacity-80"> / {num(Number(a.max_score))}</span></div>
        <div className="mt-1 text-sm opacity-90">{num(percent)}% · {t('accuracy')} {num(accuracy)}%</div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('correctCount')} value={num(a.correct ?? 0)} tone="mint" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat label={t('wrongCount')} value={num(a.wrong ?? 0)} tone="blush" icon={<XCircle className="h-5 w-5" />} />
        <Stat label={t('skipped')} value={num(a.skipped ?? 0)} tone="brand" icon={<MinusCircle className="h-5 w-5" />} />
      </div>

      {a.subjects.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">{t('subjectAccuracy')}</h2>
          <div className="space-y-3">
            {a.subjects.map((s) => {
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={s.subject_id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{pick(s, 'name')}</span><span className="text-ink-soft">{num(s.correct)}/{num(s.total)} · {num(pct)}%</span></div>
                  <Progress value={pct} tone={pct >= 70 ? 'mint' : pct >= 40 ? 'brand' : 'blush'} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">{t('review')}</h2>
          <div className="inline-flex rounded-full border border-brand-200 bg-white p-0.5 text-xs font-semibold">
            <button onClick={() => setOnlyWrong(false)} className={`rounded-full px-3 py-1 ${!onlyWrong ? 'bg-brand-600 text-white' : 'text-brand-700'}`}>{t('allQuestions')}</button>
            <button onClick={() => setOnlyWrong(true)} className={`rounded-full px-3 py-1 ${onlyWrong ? 'bg-blush-600 text-white' : 'text-blush-700'}`}>{t('onlyWrong')}</button>
          </div>
        </div>
        <div className="space-y-3">
          {list.map((q) => {
            const pos = a.questions.indexOf(q) + 1;
            return (
              <article key={q.position} className="card p-4">
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-brand-700">{num(pos)}.</span>
                  <span className="text-ink-soft">{q.code}</span>
                  <span className={`chip ml-auto ${q.is_correct ? 'bg-mint-100 text-mint-700' : q.selected === null ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>
                    {q.is_correct ? t('correct') : q.selected === null ? t('notAttempted') : t('wrong')}
                  </span>
                </div>
                <h3 className="mb-3 font-medium leading-relaxed text-ink">{lang === 'bn' ? q.question_bn : q.question_en}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, i) => {
                    const isCorrect = o.idx === q.correct_option;
                    const isMine = o.idx === q.selected;
                    const cls = isCorrect ? 'border-mint-400 bg-mint-50 text-mint-800' : isMine ? 'border-red-300 bg-red-50 text-red-700' : 'border-brand-100';
                    return (
                      <div key={o.idx} className={`flex items-start gap-2 rounded-xl border p-2.5 text-sm ${cls}`}>
                        <b className="w-5 shrink-0">{letters[i]}</b>
                        <span className="flex-1">{lang === 'bn' ? o.bn : o.en}</span>
                        {isMine && <span className="text-[11px] font-semibold">{t('yourAnswer')}</span>}
                      </div>
                    );
                  })}
                </div>
                {(lang === 'bn' ? q.explanation_bn : q.explanation_en) && (
                  <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm leading-relaxed text-ink"><b>{t('explanation')}:</b> {lang === 'bn' ? q.explanation_bn : q.explanation_en}</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/mock-tests" className="btn-success"><RotateCcw className="h-4 w-4" />{t('retake')}</Link>
        <Link href="/wrong-answers" className="btn-ghost">{t('wrongAnswers')}</Link>
        <Link href="/dashboard" className="btn-ghost">{t('dashboard')}</Link>
      </div>
    </div>
  );
}
