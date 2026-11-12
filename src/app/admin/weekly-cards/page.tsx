'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Spinner } from '@/components/ui';
import { bnNum } from '@/lib/circulars';
import { bnOrdinal, downloadCanvas, drawTop3, weekLabel, type Winner } from '@/lib/winnerCard';

type Data = { week_start: string; final: boolean; participants: number; top: Winner[] };

const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const fmt = (x: number) => bnNum(Number.isInteger(Number(x)) ? Number(x) : Number(x).toFixed(1).replace(/\.0$/, ''));

/** Weekly-test winners: a ready Facebook image of the top 3 plus a caption. */
export default function WeeklyCardsPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [week, setWeek] = useState<string | null>(null);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async (w: string | null) => {
    setErr('');
    const { data, error } = await sb.rpc('weekly_winners', w ? { p_week: w } : {});
    if (error) setErr(error.message); else { setD(data as Data); setWeek((data as Data).week_start); }
  }, [sb]);
  useEffect(() => { load(null); }, [load]);
  useEffect(() => { if (d && d.top.length && cv.current) drawTop3(cv.current, { weekStart: d.week_start, participants: d.participants, top: d.top }); }, [d]);

  const caption = d && d.top.length ? [
    `🏆 সাপ্তাহিক ফ্রি মডেল টেস্টের সেরা ৩ জন (${weekLabel(d.week_start)})`,
    '',
    ...d.top.slice(0, 3).map((w) => `${['🥇', '🥈', '🥉'][w.rank - 1]} ${bnOrdinal(w.rank)}: ${w.name} — ${fmt(w.score)}/${fmt(w.max)} (${bnNum(w.mins)} মিনিট)`),
    '',
    `এবার অংশ নিয়েছেন ${bnNum(d.participants)} জন। সবাইকে অভিনন্দন! 🎉`,
    '',
    'এই সপ্তাহের নতুন টেস্ট চলছে — শনিবার থেকে শুক্রবার, যেকোনো দিন যেকোনো সময়, ডিউটির ফাঁকে। ৫০ প্রশ্ন · ৪০ মিনিট · একদম ফ্রি।',
    '👉 nursingcareerbd.com/weekly-test',
    '',
    '#সাপ্তাহিক_মডেল_টেস্ট #সিনিয়র_স্টাফ_নার্স #নার্সিং_প্রস্তুতি #NursingCareerBD',
  ].join('\n') : '';

  async function copy() { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }

  return (
    <div>
      <PageHeader title="সাপ্তাহিক টেস্টের বিজয়ী কার্ড" sub="প্রতি শনিবার গত সপ্তাহের সেরা ৩ জনের ছবি ও ক্যাপশন তৈরি থাকে — ডাউনলোড করে ফেসবুকে পোস্ট করুন।" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-ghost" disabled={!week} onClick={() => week && load(addDays(week, -7))}>← আগের সপ্তাহ</button>
        <span className="chip bg-brand-50 text-brand-700">{week ? weekLabel(week) : '…'}{d && !d.final ? ' · চলছে (প্রিভিউ)' : ''}</span>
        <button className="btn-ghost" disabled={!week || !d?.final} onClick={() => week && load(addDays(week, 7))}>পরের সপ্তাহ →</button>
      </div>
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!d ? <Spinner /> : d.top.length === 0 ? (
        <p className="card p-6 text-center text-ink-soft">এই সপ্তাহে কেউ পরীক্ষা শেষ করেননি — কার্ড তৈরির মতো ফল নেই।</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-3">
            <canvas ref={cv} className="h-auto w-full rounded-xl" />
            <button onClick={() => cv.current && downloadCanvas(cv.current, `weekly-top3-${d.week_start}.png`)} className="btn-pink mt-3 w-full"><Download className="h-4 w-4" />ছবি ডাউনলোড</button>
            {!d.final && <p className="mt-2 text-xs text-gold-700">এই সপ্তাহ এখনো চলছে — ফল বদলাতে পারে। শনিবার চূড়ান্ত কার্ড পোস্ট করুন।</p>}
          </div>
          <div className="space-y-4">
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold text-ink">ক্যাপশন</p>
              <textarea readOnly className="input min-h-[260px] text-sm" value={caption} />
              <button onClick={copy} className="btn-primary mt-3 w-full">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'কপি হয়েছে' : 'ক্যাপশন কপি'}</button>
            </div>
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold text-ink">সেরা ১০ জন · অংশগ্রহণ {bnNum(d.participants)} জন</p>
              <ol className="divide-y divide-brand-100 text-sm">
                {d.top.map((w) => (
                  <li key={w.rank} className="flex items-center gap-2 py-2">
                    <b className="w-8 text-brand-700">{bnNum(w.rank)}</b>
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    <span className={`chip ${w.consent ? 'bg-mint-100 text-mint-700' : 'bg-slate-100 text-slate-600'}`}>{w.consent ? 'নাম দেখানোর অনুমতি আছে' : 'নাম লুকানো'}</span>
                    <b className="w-16 text-right">{fmt(w.score)}/{fmt(w.max)}</b>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-ink-soft">যারা অনুমতি দেননি, তাদের নাম আংশিক লুকানো থাকে এবং ছবি দেখানো হয় না।</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
