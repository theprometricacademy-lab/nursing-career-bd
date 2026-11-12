'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Clock, Medal, Play, Trophy, Users } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Spinner } from '@/components/ui';
import { trackEvent } from '@/components/Tracker';
import { bnNum } from '@/lib/circulars';

type Row = { rank: number; name: string; score: number; max: number; mins: number; me?: boolean };
type Status = {
  week_start: string; week_end: string; questions: number; minutes: number; negative: number; participants: number;
  top: Row[]; last_week: { participants: number; top: Row[] };
  me: { id: string; status: 'in_progress' | 'submitted'; score: number | null; max: number | null; rank: number | null } | null;
};

const MEDAL = ['from-gold-300 to-gold-500 text-gold-900', 'from-slate-200 to-slate-400 text-slate-800', 'from-orange-300 to-orange-500 text-orange-950'];

/** Free weekly model test: open the whole week (Sat–Fri), one attempt each, ranked among everyone who sat it. */
export default function WeeklyTestPage() {
  const { user, ready, lang } = useApp();
  const router = useRouter();
  const bn = lang === 'bn';
  const n = (x: number | string) => (bn ? bnNum(x) : String(x));
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    supabaseBrowser().rpc('weekly_test_status').then(({ data, error }) => {
      if (error) setErr(error.message); else setS(data as Status);
    });
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, user, load]);

  async function start() {
    if (!user) { router.push('/login?next=/weekly-test'); return; }
    setBusy(true); setErr('');
    trackEvent('/weekly-test/start');
    const { data, error } = await supabaseBrowser().rpc('start_weekly_test');
    if (error) {
      setBusy(false);
      if (error.message.includes('already_taken')) { load(); return; }
      setErr(bn ? 'পরীক্ষা শুরু করা যায়নি, আবার চেষ্টা করুন।' : 'Could not start, please try again.');
      return;
    }
    router.push(`/exam/${data}`);
  }

  if (!s) return err ? <p className="rounded-xl bg-red-50 p-4 text-red-700">{err}</p> : <Spinner />;

  const left = Math.max(0, new Date(s.week_end).getTime() - Date.now());
  const days = Math.floor(left / 86400000), hours = Math.floor((left % 86400000) / 3600000);
  const leftText = bn
    ? `${days > 0 ? `${n(days)} দিন ` : ''}${n(hours)} ঘণ্টা`
    : `${days > 0 ? `${days}d ` : ''}${hours}h`;
  const fmt = (d: string, opt: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', ...opt });
  const lastDay = new Date(new Date(s.week_end).getTime() - 1000).toISOString();
  const me = s.me;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-blush-500 p-6 text-white shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><Award className="h-5 w-5" />{bn ? 'প্রতি সপ্তাহে নতুন · একদম ফ্রি' : 'New every week · Free'}</div>
        <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{bn ? 'সাপ্তাহিক ফ্রি মডেল টেস্ট' : 'Free weekly model test'}</h1>
        <p className="mt-1 text-sm text-white/90">
          {bn
            ? `${fmt(s.week_start, { day: 'numeric', month: 'long' })} – ${fmt(lastDay, { day: 'numeric', month: 'long' })} · সপ্তাহের যেকোনো দিন, যেকোনো সময় পরীক্ষা দিন। ডিউটির ফাঁকে সুবিধামতো সময়ে বসুন।`
            : `${fmt(s.week_start, { day: 'numeric', month: 'long' })} – ${fmt(lastDay, { day: 'numeric', month: 'long' })} · Sit it any day, any time this week — whenever your shift allows.`}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-2xl bg-white/15 p-2.5"><div className="text-xl font-extrabold">{n(s.questions)}</div>{bn ? 'প্রশ্ন' : 'questions'}</div>
          <div className="rounded-2xl bg-white/15 p-2.5"><div className="text-xl font-extrabold">{n(s.minutes)}</div>{bn ? 'মিনিট' : 'minutes'}</div>
          <div className="rounded-2xl bg-white/15 p-2.5"><div className="text-xl font-extrabold">{n(s.negative)}</div>{bn ? 'ভুলে কাটা' : 'per wrong'}</div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{bn ? `এই সপ্তাহের টেস্ট শেষ হতে বাকি ${leftText}` : `${leftText} left this week`}</span>
          {s.participants > 0 && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{bn ? `অংশ নিয়েছেন ${n(s.participants)} জন` : `${s.participants} took part`}</span>}
        </p>
      </header>

      <section className="card p-5">
        {me?.status === 'submitted' ? (
          <div className="text-center">
            <p className="text-sm text-ink-soft">{bn ? 'এই সপ্তাহে আপনার ফল' : 'Your result this week'}</p>
            <div className="mt-1 text-4xl font-extrabold text-brand-700">{n(Number(me.score))}<span className="text-xl text-ink-soft">/{n(Number(me.max))}</span></div>
            {me.rank && <p className="mt-1 text-lg font-bold text-ink">{bn ? `অবস্থান: ${n(me.rank)} / ${n(s.participants)} জনের মধ্যে` : `Rank ${me.rank} of ${s.participants}`}</p>}
            <p className="mt-1 text-sm text-ink-soft">{bn ? 'পরের শনিবার নতুন টেস্ট আসবে। এর মধ্যে আরও যারা দেবেন, তাদের সাথে অবস্থান বদলাতে পারে।' : 'A new test arrives next Saturday. Your rank can change as more people sit this one.'}</p>
            <Link href={`/result/${me.id}`} className="btn-primary mt-3">{bn ? 'উত্তর ও ব্যাখ্যা দেখুন' : 'See answers & explanations'}</Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink-soft">
              {bn
                ? 'বাংলা, ইংরেজি, সাধারণ জ্ঞান ও নার্সিং — সরকারি নার্স নিয়োগ পরীক্ষার মতো করে সাজানো। প্রত্যেকে সপ্তাহে একবার দিতে পারবেন; পরীক্ষা শেষে সবার মধ্যে আপনার অবস্থান দেখাবে।'
                : 'Bangla, English, GK and Nursing — laid out like the govt nurse recruitment exam. One attempt per week; at the end you see where you stand among everyone.'}
            </p>
            <button className="btn-success mt-4 w-full !py-3.5 text-lg" disabled={busy} onClick={start}>
              <Play className="h-5 w-5" />
              {busy ? (bn ? 'শুরু হচ্ছে…' : 'Starting…')
                : me?.status === 'in_progress' ? (bn ? 'পরীক্ষা চালিয়ে যান' : 'Continue the test')
                : !user ? (bn ? 'লগইন করে পরীক্ষা দিন' : 'Log in to take the test')
                : (bn ? 'এখনই পরীক্ষা দিন' : 'Start the test')}
            </button>
            <p className="mt-2 text-center text-xs text-ink-soft">{bn ? `শুরু করলে ${n(s.minutes)} মিনিটের মধ্যে শেষ করতে হবে — সময় নিয়ে বসুন।` : `Once started you have ${s.minutes} minutes — sit down when you have the time.`}</p>
            {err && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink"><Trophy className="h-5 w-5 text-gold-500" />{bn ? 'এই সপ্তাহের মেধাতালিকা' : "This week's ranking"}</h2>
        {s.top.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{bn ? 'এই সপ্তাহে এখনো কেউ পরীক্ষা দেননি — আপনিই প্রথম হোন!' : 'Nobody has sat it yet this week — be the first!'}</p>
        ) : (
          <ol className="mt-3 divide-y divide-brand-100">
            {s.top.map((r) => (
              <li key={r.rank} className={`flex items-center gap-3 py-2.5 ${r.me ? 'rounded-xl bg-brand-50 px-2' : ''}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${r.rank <= 3 ? `bg-gradient-to-br ${MEDAL[r.rank - 1]}` : 'bg-brand-50 text-brand-700'}`}>{n(r.rank)}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.name}{r.me && <span className="ml-1 text-xs text-brand-700">({bn ? 'আপনি' : 'you'})</span>}</span>
                <span className="text-xs text-ink-soft">{n(r.mins)} {bn ? 'মি' : 'min'}</span>
                <b className="w-16 text-right text-ink">{n(Number(r.score))}/{n(Number(r.max))}</b>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-ink-soft">{bn ? 'নম্বর বেশি হলে আগে; সমান হলে যিনি কম সময়ে শেষ করেছেন তিনি আগে।' : 'Higher score first; on a tie, the faster finish ranks higher.'}</p>
      </section>

      {s.last_week.top.length > 0 && (
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Medal className="h-5 w-5 text-blush-600" />{bn ? `গত সপ্তাহের সেরা ৩ জন (${n(s.last_week.participants)} জনের মধ্যে)` : `Last week's top 3 (of ${s.last_week.participants})`}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {s.last_week.top.map((r) => (
              <div key={r.rank} className={`rounded-2xl bg-gradient-to-br p-3 ${MEDAL[r.rank - 1]}`}>
                <div className="text-2xl font-extrabold">{n(r.rank)}</div>
                <div className="truncate text-sm font-semibold">{r.name}</div>
                <div className="text-xs">{n(Number(r.score))}/{n(Number(r.max))}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
