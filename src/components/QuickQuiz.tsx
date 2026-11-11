'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Sparkles, RotateCcw, UserPlus } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { ShareButtons } from './ShareResult';

type QQ = { id: number; question_bn: string; options_bn: string[]; correct_option: number; explanation_bn: string; subject_bn: string };
const LET = ['ক', 'খ', 'গ', 'ঘ'];

/** No-login 5-question quiz for visitors: instant feedback, then a sign-up nudge with the score. */
export function QuickQuiz() {
  const { num } = useApp();
  const [qs, setQs] = useState<QQ[] | null>(null);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    supabaseBrowser().rpc('public_quick_quiz', { p_count: 5 }).then(({ data }) => setQs((data as QQ[]) ?? []));
  }, [round]);

  if (qs && qs.length === 0) return null;
  const done = qs && i >= qs.length;
  const q = qs && !done ? qs[i] : null;
  const choose = (k: number) => { if (pick !== null || !q) return; setPick(k); if (k === q.correct_option) setScore((s) => s + 1); };
  const next = () => { setPick(null); setI((x) => x + 1); };
  const again = () => { setQs(null); setI(0); setPick(null); setScore(0); setRound((r) => r + 1); };

  return (
    <section id="quick-quiz" className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
      <div className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-blush-500 px-4 py-3 text-white">
        <Sparkles className="h-5 w-5" />
        <b className="flex-1">৫ প্রশ্নের ফ্রি কুইজ · লগইন লাগবে না</b>
        {qs && !done && started && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold">{num(i + 1)}/{num(qs.length)}</span>}
      </div>

      {!started ? (
        <div className="p-5 text-center">
          <p className="text-lg font-bold text-ink">সরকারি নার্সিং পরীক্ষার প্রশ্নে নিজেকে যাচাই করুন</p>
          <p className="mt-1 text-sm text-ink-soft">প্রতিটা প্রশ্নের সাথে সাথে সঠিক উত্তর ও ব্যাখ্যা দেখবেন। সময় লাগবে ১–২ মিনিট।</p>
          <button className="btn-primary mt-4 w-full !py-3 text-base sm:w-auto sm:px-10" disabled={!qs} onClick={() => setStarted(true)}>
            {qs ? 'কুইজ শুরু করুন' : 'লোড হচ্ছে…'}
          </button>
        </div>
      ) : done ? (
        <div className="p-5 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-mint-400 to-brand-500 text-3xl font-extrabold text-white">{num(score)}/{num(qs!.length)}</div>
          <p className="mt-3 text-lg font-bold text-ink">
            {score === qs!.length ? 'দারুণ! সবগুলো সঠিক 🎉' : score >= 3 ? 'ভালো করেছেন! আরেকটু অনুশীলন করলেই পারফেক্ট।' : 'চিন্তা নেই, নিয়মিত অনুশীলনেই উন্নতি হবে।'}
          </p>
          <p className="mt-1 text-sm text-ink-soft">ফ্রি অ্যাকাউন্ট খুলে ১০,০০০+ ব্যাখ্যাসহ প্রশ্ন, বিগত ১০ বছরের সরকারি পরীক্ষার প্রশ্ন আর দৈনিক কুইজ দিন।</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-success !py-3 text-base"><UserPlus className="h-5 w-5" />ফ্রি অ্যাকাউন্ট খুলুন</Link>
            <button onClick={again} className="btn-ghost !py-3"><RotateCcw className="h-4 w-4" />আরও ৫টা প্রশ্ন</button>
          </div>
          <div className="mt-4"><ShareButtons text={`আমি নার্সিং কুইজে ৫-এ ${num(score)} পেয়েছি! তুমি কত পাও দেখো 👇`} path="/" /></div>
        </div>
      ) : q ? (
        <div className="p-4 md:p-5">
          <p className="mb-1 text-xs font-semibold text-brand-600">{q.subject_bn}</p>
          <h3 className="mb-3 text-base font-semibold leading-relaxed text-ink md:text-lg">{q.question_bn}</h3>
          <div className="grid gap-2">
            {q.options_bn.map((o, k) => {
              let cls = 'border-brand-100 hover:border-brand-300 hover:bg-brand-50';
              if (pick !== null) {
                if (k === q.correct_option) cls = 'border-mint-400 bg-mint-50 text-mint-800';
                else if (k === pick) cls = 'border-red-300 bg-red-50 text-red-700';
                else cls = 'border-brand-100 opacity-60';
              }
              return (
                <button key={k} disabled={pick !== null} onClick={() => choose(k)} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition md:text-base ${cls}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold ring-1 ring-current/20">{LET[k]}</span>
                  <span className="flex-1">{o}</span>
                  {pick !== null && k === q.correct_option && <CheckCircle2 className="h-5 w-5 text-mint-600" />}
                  {pick === k && k !== q.correct_option && <XCircle className="h-5 w-5 text-red-500" />}
                </button>
              );
            })}
          </div>
          {pick !== null && (
            <div className="mt-3 animate-rise">
              <p className={`rounded-xl p-3 text-sm leading-relaxed ${pick === q.correct_option ? 'bg-mint-50 text-mint-900' : 'bg-red-50 text-red-900'}`}>
                <b>{pick === q.correct_option ? 'সঠিক! ' : `ভুল — সঠিক উত্তর: ${LET[q.correct_option]}। `}</b>{q.explanation_bn}
              </p>
              <button onClick={next} className="btn-primary mt-3 w-full !py-3">{i + 1 < qs!.length ? 'পরের প্রশ্ন →' : 'ফলাফল দেখুন'}</button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
