'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Crown, Medal, Play, Trophy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Spinner } from '@/components/ui';
import { bnDate, bnNum } from '@/lib/circulars';

type Row = { rank: number; name: string; pct: number; score: number; max: number; tests: number; me: boolean };
type Board = { week_start: string; week_end: string; participants: number; rows: Row[]; me: { rank: number; pct: number; tests: number } | null };

const MEDAL = ['from-gold-300 to-gold-500 text-gold-900', 'from-slate-200 to-slate-400 text-slate-800', 'from-orange-300 to-orange-500 text-orange-950'];

export default function LeaderboardPage() {
  const { user, premium, lang } = useApp();
  const bn = lang === 'bn';
  const n = (x: number | string) => (bn ? bnNum(x) : String(x));
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    setBoard(null);
    supabaseBrowser().rpc('weekly_leaderboard', { p_weeks_ago: weeksAgo }).then(({ data }) => setBoard((data as Board) ?? null));
  }, [weeksAgo, user]);

  const top3 = board?.rows.slice(0, 3) ?? [];
  const rest = board?.rows.slice(3) ?? [];
  const endShown = board ? new Date(new Date(board.week_end).getTime() - 1000).toISOString() : '';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="gold-card p-6 text-center">
        <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-gold-400/25 blur-3xl" />
        <Trophy className="relative mx-auto h-10 w-10 text-gold-300" />
        <h1 className="relative mt-2 text-2xl font-extrabold"><span className="gold-text">{bn ? 'সাপ্তাহিক মেধাতালিকা' : 'Weekly leaderboard'}</span></h1>
        <p className="relative mt-1 text-sm text-white/80">
          {bn ? 'প্রিমিয়াম মডেল টেস্ট সিরিজের (১০০ নম্বর) সপ্তাহের সেরা নম্বর গণনা হয়। সপ্তাহ শনিবার শুরু হয়।' : 'Your best score this week in the premium model test series (100 marks) counts. Weeks start on Saturday.'}
        </p>
        {board && <p className="relative mt-2 text-xs text-gold-200">{bnDate(board.week_start)} – {bnDate(endShown)} · {n(board.participants)} {bn ? 'জন অংশ নিয়েছেন' : 'participants'}</p>}
        <div className="relative mt-4 inline-flex rounded-full bg-white/10 p-1 text-sm">
          {[0, 1].map((w) => (
            <button key={w} onClick={() => setWeeksAgo(w)} className={`rounded-full px-4 py-1.5 font-semibold ${weeksAgo === w ? 'bg-gradient-to-r from-gold-300 to-gold-500 text-gold-900' : 'text-white/80'}`}>
              {w === 0 ? (bn ? 'এই সপ্তাহ' : 'This week') : (bn ? 'গত সপ্তাহ' : 'Last week')}
            </button>
          ))}
        </div>
      </header>

      {board?.me && (
        <div className="card flex items-center gap-3 border-gold-300 bg-gold-50 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-extrabold text-gold-900">{n(board.me.rank)}</span>
          <div className="flex-1 text-sm text-ink">
            <b>{bn ? 'আপনার অবস্থান' : 'Your position'}: {n(board.me.rank)}</b>
            <span className="block text-ink-soft">{bn ? 'সেরা নম্বর' : 'Best'} {n(board.me.pct)}% · {n(board.me.tests)} {bn ? 'টি টেস্ট' : 'tests'}</span>
          </div>
        </div>
      )}

      {!board ? <Spinner /> : board.rows.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-soft">
          <Medal className="mx-auto mb-2 h-10 w-10 text-gold-400" />
          {weeksAgo === 0
            ? (bn ? 'এই সপ্তাহে এখনো কেউ মডেল টেস্ট দেননি। প্রথম হওয়ার সুযোগ আপনার!' : 'No one has taken a model test this week yet. Be the first!')
            : (bn ? 'গত সপ্তাহে কোনো অংশগ্রহণ ছিল না।' : 'No entries last week.')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2">
            {[1, 0, 2].map((i) => {
              const r = top3[i]; if (!r) return <div key={i} />;
              const h = i === 0 ? 'pt-6 pb-5' : 'pt-4 pb-4';
              return (
                <div key={i} className={`card text-center ${h} ${r.me ? 'ring-2 ring-gold-400' : ''}`}>
                  <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-lg font-extrabold ${MEDAL[i]}`}>{i === 0 ? <Crown className="h-6 w-6" /> : n(r.rank)}</div>
                  <div className="mt-2 truncate px-2 text-sm font-bold text-ink">{r.name}</div>
                  <div className="text-lg font-extrabold text-ink">{n(r.pct)}%</div>
                  <div className="text-[11px] text-ink-soft">{n(r.score)}/{n(r.max)}</div>
                </div>
              );
            })}
          </div>
          {rest.length > 0 && (
            <ol className="card divide-y divide-brand-100">
              {rest.map((r) => (
                <li key={r.rank + r.name} className={`flex items-center gap-3 px-4 py-3 ${r.me ? 'bg-gold-50' : ''}`}>
                  <span className="w-8 text-center font-bold text-ink-soft">{n(r.rank)}</span>
                  <span className="flex-1 font-semibold text-ink">{r.name}{r.me && <span className="ml-2 gold-chip">{bn ? 'আপনি' : 'You'}</span>}</span>
                  <span className="text-right"><b className="text-ink">{n(r.pct)}%</b><span className="block text-[11px] text-ink-soft">{n(r.tests)} {bn ? 'টেস্ট' : 'tests'}</span></span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <p className="flex-1 text-sm text-ink-soft">{premium
          ? (bn ? 'নতুন মডেল টেস্ট দিন, সেরা নম্বরটাই তালিকায় থাকবে।' : 'Take another model test — only your best score counts.')
          : (bn ? 'মেধাতালিকায় নাম তুলতে প্রিমিয়াম মডেল টেস্ট সিরিজে অংশ নিন।' : 'Join the premium model test series to get on the leaderboard.')}</p>
        {premium
          ? <Link href="/mock-tests" className="btn-success"><Play className="h-4 w-4" />{bn ? 'মডেল টেস্ট দিন' : 'Take a test'}</Link>
          : <Link href="/premium" className="btn bg-gradient-to-r from-gold-400 to-gold-500 text-gold-900 hover:brightness-105"><Crown className="h-4 w-4" />{bn ? 'প্রিমিয়াম নিন' : 'Go Premium'}</Link>}
      </div>
      <p className="text-center text-xs text-ink-soft">{bn ? 'গোপনীয়তার জন্য শুধু নামের প্রথম অংশ দেখানো হয়।' : 'Only first names are shown for privacy.'}</p>
    </div>
  );
}
