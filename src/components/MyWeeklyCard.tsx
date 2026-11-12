'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Download, Share2, Trophy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { bnOrdinal, downloadCanvas, drawMyCard, shareCanvas } from '@/lib/winnerCard';
import { bnNum } from '@/lib/circulars';
import { useApp } from './AppProvider';

type R = { week_start: string; final: boolean; rank: number; participants: number; score: number; max: number; correct: number; mins: number };

/** "Share my result" card for the weekly test: the member downloads or shares their own rank image. */
export function MyWeeklyCard({ compact = false }: { compact?: boolean }) {
  const { user, profile } = useApp();
  const [rows, setRows] = useState<R[] | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser().rpc('my_weekly_results').then(({ data }) => setRows((data as R[] | null) ?? []));
  }, [user]);

  const r = rows?.[0];
  const name = (profile?.full_name ?? '').trim() || 'আমি';
  useEffect(() => {
    if (open && r && cv.current) drawMyCard(cv.current, { name, avatar: profile?.avatar_path ?? null, rank: r.rank, participants: r.participants, score: Number(r.score), max: Number(r.max), mins: r.mins, weekStart: r.week_start, final: r.final });
  }, [open, r, name, profile?.avatar_path]);

  if (!user || !r) return null;
  const file = `weekly-test-${r.week_start}.png`;
  const text = `সাপ্তাহিক ফ্রি মডেল টেস্টে আমি ${bnNum(r.participants)} জনের মধ্যে ${bnOrdinal(r.rank)} হয়েছি! আপনিও দিন 👉 https://nursingcareerbd.com/weekly-test`;

  async function share() {
    if (!cv.current) return;
    const ok = await shareCanvas(cv.current, file, text);
    if (!ok) { await downloadCanvas(cv.current, file); setNote('ছবি ডাউনলোড হয়েছে — ফেসবুকে পোস্ট করার সময় ছবিটি যুক্ত করুন।'); }
  }

  return (
    <section className={`card border-gold-300 bg-gradient-to-r from-gold-50 to-white p-4 ${compact ? '' : 'md:p-5'}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-blush-500 text-white"><Trophy className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">{r.final ? 'গত সপ্তাহে' : 'এই সপ্তাহে'} আপনি {bnOrdinal(r.rank)} স্থানে {r.final ? '' : '(এখন পর্যন্ত)'}</div>
          <div className="text-sm text-ink-soft">{bnNum(r.participants)} জনের মধ্যে · আপনার ফলের কার্ড বন্ধুদের সাথে শেয়ার করুন</div>
        </div>
        {!open && <button className="btn-primary !py-2" onClick={() => setOpen(true)}><Share2 className="h-4 w-4" />কার্ড</button>}
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <canvas ref={cv} className="mx-auto h-auto w-full max-w-sm rounded-xl shadow-card" />
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
            <button className="btn-pink" onClick={share}><Share2 className="h-4 w-4" />শেয়ার করুন</button>
            <button className="btn-ghost" onClick={() => cv.current && downloadCanvas(cv.current, file)}><Download className="h-4 w-4" />ডাউনলোড</button>
          </div>
          {note && <p className="text-center text-xs text-mint-700">{note}</p>}
          <p className="text-center text-xs text-ink-soft">
            কার্ডে আপনার পুরো নাম ও প্রোফাইল ছবি থাকে। নাম বা ছবি বদলাতে <Link href="/profile" className="text-brand-700 underline">প্রোফাইল</Link>-এ যান।
          </p>
        </div>
      )}
    </section>
  );
}
