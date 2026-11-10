'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, CheckCircle2, XCircle, Lock, Languages, RotateCcw } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { PremiumChip } from './ui';
import { ReportQuestion } from './ReportQuestion';

export type BankQuestion = {
  id: number; code: string; subject_id: number; topic_id: number | null; exam_id: number | null; year: number | null;
  difficulty: 'easy' | 'medium' | 'hard'; is_premium: boolean; locked: boolean;
  question_en: string | null; question_bn: string | null; options_en: string[] | null; options_bn: string[] | null; bookmarked: boolean;
  exam_lang: 'bn' | 'en'; translatable: boolean;
};

const LETTERS_EN = ['A', 'B', 'C', 'D'];
const LETTERS_BN = ['ক', 'খ', 'গ', 'ঘ'];

export function QuestionCard({ q, index, subjectName, onBookmarkChange }: {
  q: BankQuestion; index: number; subjectName?: string; onBookmarkChange?: (id: number, v: boolean) => void;
}) {
  const { t, lang, num, user, errMsg } = useApp();
  const [view, setView] = useState<'bn' | 'en'>(q.translatable ? lang : q.exam_lang);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correct_option: number; explanation_en: string | null; explanation_bn: string | null } | null>(null);
  const [known, setKnown] = useState<{ correct: boolean; correct_option: number; explanation_en: string | null; explanation_bn: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [marked, setMarked] = useState(q.bookmarked);
  // Show the options in a fresh random order every time the card mounts, so the right answer is not always in the
  // same slot. `order[pos]` is the original option index shown at display position `pos`; answers are still checked
  // by original index. Shuffled after mount (not during render) so server and browser markup match.
  const optCount = Math.max(q.options_bn?.length ?? 0, q.options_en?.length ?? 0);
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: optCount }, (_, i) => i));
  useEffect(() => {
    const a = Array.from({ length: optCount }, (_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    setOrder(a);
  }, [q.id, optCount]);

  const text = view === 'bn' ? q.question_bn : q.question_en;
  const options = view === 'bn' ? q.options_bn : q.options_en;
  const letters = view === 'bn' ? LETTERS_BN : LETTERS_EN;
  const expl = q.translatable ? view : lang; // untranslated subjects: explain in the reader's language
  const diffTone = { easy: 'bg-mint-50 text-mint-700', medium: 'bg-brand-50 text-brand-700', hard: 'bg-blush-50 text-blush-700' }[q.difficulty];

  // One tap on an option checks it straight away (practice only; mock tests keep answers hidden until the end)
  async function choose(i: number) {
    if (result || busy) return;
    setSelected(i);
    // A retry is checked on the phone: only the first answer counts in the student's stats
    // (otherwise a retry after seeing the answer would drop it from "wrong answer practice").
    if (known) { setResult({ ...known, correct: i === known.correct_option }); return; }
    if (!user) { setErr(t('loginRequired')); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabaseBrowser().rpc('check_answer', { p_question: q.id, p_option: i });
    setBusy(false);
    if (error) setErr(errMsg(error)); else { setResult(data); setKnown(data); }
  }

  // Retry: hide the answer and reshuffle the options, so it isn't just remembering the position
  function tryAgain() {
    setResult(null); setSelected(null); setErr('');
    setOrder((o) => { const a = [...o]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
  }

  async function toggleBookmark() {
    if (!user) { setErr(t('loginRequired')); return; }
    const sb = supabaseBrowser();
    const next = !marked;
    setMarked(next);
    const { error } = next
      ? await sb.from('bookmarks').insert({ user_id: user.id, question_id: q.id })
      : await sb.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', q.id);
    if (error) setMarked(!next); else onBookmarkChange?.(q.id, next);
  }

  return (
    <article className="wm card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-brand-700">{num(index)}.</span>
        <span className="text-ink-soft">{q.code}</span>
        {subjectName && <span className="chip bg-brand-50 text-brand-700">{subjectName}</span>}
        <span className={`chip ${diffTone}`}>{t(q.difficulty)}</span>
        {q.year && <span className="chip bg-white text-ink-soft ring-1 ring-brand-100">{num(q.year)}</span>}
        {q.is_premium && <PremiumChip />}
        <div className="ml-auto flex items-center gap-1">
          {!q.locked && q.translatable && (
            <button onClick={() => setView(view === 'bn' ? 'en' : 'bn')} className="flex items-center gap-1 rounded-lg px-2 py-1 text-brand-700 hover:bg-brand-50" title={t('language')}>
              <Languages className="h-4 w-4" />{view === 'bn' ? 'EN' : 'বাং'}
            </button>
          )}
          {!q.locked && <ReportQuestion questionId={q.id} code={q.code} />}
          <button onClick={toggleBookmark} className="rounded-lg p-1.5 text-blush-600 hover:bg-blush-50" aria-label={t('bookmark')}>
            {marked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {q.locked ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-blush-50 p-6 text-center">
          <Lock className="h-6 w-6 text-blush-600" />
          <p className="text-sm text-blush-700">{t('locked')}</p>
          <Link href="/premium" className="btn-pink">{t('unlock')}</Link>
        </div>
      ) : (
        <>
          <h3 className="mb-3 font-medium leading-relaxed text-ink">{text}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {options && order.map((i, pos) => {
              const opt = options[i];
              if (opt == null) return null;
              let cls = 'border-brand-100 hover:border-brand-300 hover:bg-brand-50';
              if (result) {
                if (i === result.correct_option) cls = 'border-mint-400 bg-mint-50 text-mint-700';
                else if (i === selected) cls = 'border-red-300 bg-red-50 text-red-700';
                else cls = 'border-brand-100 opacity-70';
              } else if (i === selected) cls = 'border-brand-500 bg-brand-50 ring-2 ring-brand-100';
              return (
                <button key={i} disabled={!!result || busy} onClick={() => choose(i)}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-left text-sm transition ${cls}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold ring-1 ring-current/20">{letters[pos]}</span>
                  <span className="pt-0.5">{opt}</span>
                </button>
              );
            })}
          </div>

          {!result ? (
            <div className="mt-3 flex items-center gap-3 text-sm">
              {busy ? <span className="text-ink-soft">{t('loading')}</span>
                : err ? <span className="text-red-600">{err} {!user && <Link className="font-semibold underline" href="/login">{t('login')}</Link>}</span>
                : <span className="text-xs text-ink-soft">{t('tapToAnswer')}</span>}
            </div>
          ) : (
            <div className={`mt-3 rounded-xl p-3 text-sm ${result.correct ? 'bg-mint-50' : 'bg-red-50'}`}>
              <div className={`flex items-center gap-2 font-semibold ${result.correct ? 'text-mint-700' : 'text-red-700'}`}>
                {result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {result.correct ? t('correct') : `${t('wrong')} — ${t('correctAnswer')}: ${letters[Math.max(0, order.indexOf(result.correct_option))]}`}
              </div>
              {(expl === 'bn' ? result.explanation_bn : result.explanation_en) && (
                <p className="mt-2 leading-relaxed text-ink"><b>{t('explanation')}:</b> {expl === 'bn' ? result.explanation_bn : result.explanation_en}</p>
              )}
              <button onClick={tryAgain} className="btn-ghost mt-3 !px-3 !py-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />{t('tryAgain')}
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
