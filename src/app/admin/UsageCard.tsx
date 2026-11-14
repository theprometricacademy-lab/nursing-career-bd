'use client';
import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { bnNum } from '@/lib/circulars';

type Resend = { daily_used?: number | null; daily_limit?: number | null; monthly_used?: number | null; monthly_limit?: number | null; at?: string; error?: string };
type U = { db_bytes: number; storage_bytes: number; views_today: number; visitors_today: number; max_views_day_7d: number; email_signups_today: number; mau: number;
  resend?: Resend; email_today?: number };

// Supabase Pro plan (since 14 Nov 2026): 8 GB database disk, 100,000 monthly users, 100 GB file storage
const DB_MB = 8192, MAU = 100000, STORAGE_MB = 102400;

// Rough estimate: one page view ≈ 6 Worker requests (page + data + API calls)
const REQ_PER_VIEW = 6;

function Meter({ label, used, limit, unit, note }: { label: string; used: number; limit: number; unit: string; note?: string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-mint-500';
  const text = pct >= 80 ? 'text-red-700' : pct >= 60 ? 'text-amber-700' : 'text-mint-700';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className={`font-semibold ${text}`}>{bnNum(pct)}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-brand-50"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 2)}%` }} /></div>
      <div className="mt-1 text-xs text-ink-soft">{bnNum(used.toLocaleString('en-US'))} / {bnNum(limit.toLocaleString('en-US'))} {unit}{note ? ` · ${note}` : ''}</div>
    </div>
  );
}

export function UsageCard() {
  const [u, setU] = useState<U | null>(null);
  const [failed, setFailed] = useState(false);
  const [again, setAgain] = useState(0);
  useEffect(() => {
    const sb = supabaseBrowser();
    // keep the last good numbers on a failed reload; say so when nothing could be loaded at all
    const load = () => sb.rpc('admin_usage').then(({ data, error }) => {
      if (error || !data) { setFailed(true); return; }
      setFailed(false); setU(data as U);
    });
    load();
    // ask Resend for its current numbers, then read them a few seconds later
    let t: ReturnType<typeof setTimeout> | undefined;
    sb.rpc('admin_refresh_resend_usage').then(({ error }) => { if (!error) t = setTimeout(load, 5000); });
    return () => { if (t) clearTimeout(t); };
  }, [again]);
  if (!u) return failed ? (
    <section className="card p-5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink"><Gauge className="h-5 w-5 text-brand-600" />কোনটা কত ব্যবহার হলো</h2>
      <p className="text-sm text-ink-soft">হিসাবটা এখন আনা যায়নি।</p>
      <button type="button" onClick={() => { setFailed(false); setAgain((n) => n + 1); }} className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">আবার চেষ্টা করুন</button>
    </section>
  ) : null;
  // Email: Resend's own number when it could be read in the last 90 minutes, otherwise what this site sent today
  const r = u.resend ?? {};
  const exact = !r.error && typeof r.daily_used === 'number' && !!r.at && Date.now() - new Date(r.at).getTime() < 90 * 60 * 1000;
  const mailUsed = exact ? (r.daily_used as number) : (u.email_today ?? 0);
  const mailLimit = exact && typeof r.daily_limit === 'number' && r.daily_limit > 0 ? r.daily_limit : 100;
  const mailNote = exact
    ? `Resend-এর নিজের হিসাব${typeof r.monthly_used === 'number' ? ` · এই মাসে ${bnNum(r.monthly_used.toLocaleString('en-US'))}${typeof r.monthly_limit === 'number' ? ` / ${bnNum(r.monthly_limit.toLocaleString('en-US'))}` : ''}` : ''}`
    : 'সাইটের নিজের গণনা (নোটিফিকেশন ও পাসওয়ার্ড রিসেট) — নতুন অ্যাকাউন্ট খুলতে ইমেইল লাগে না';
  const mb = (b: number) => Math.round(b / 1048576);
  const reqToday = u.views_today * REQ_PER_VIEW, reqPeak = u.max_views_day_7d * REQ_PER_VIEW;
  const worst = Math.max(reqPeak / 100000, mb(u.db_bytes) / DB_MB, mailUsed / mailLimit, u.mau / MAU, mb(u.storage_bytes) / STORAGE_MB);
  const msg = worst >= 0.8 ? { t: 'কোনো একটা সীমার খুব কাছে! নিচে লাল দাগের ঘরটা দেখুন।', c: 'bg-red-50 text-red-700' }
    : worst >= 0.6 ? { t: 'সীমার কাছাকাছি যাচ্ছে — নজর রাখুন।', c: 'bg-amber-50 text-amber-700' }
    : { t: 'সব ঠিক আছে — কোনো সীমার কাছে নেই।', c: 'bg-mint-50 text-mint-700' };
  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink"><Gauge className="h-5 w-5 text-brand-600" />কোনটা কত ব্যবহার হলো</h2>
      <p className="mb-3 text-xs text-ink-soft">Supabase: Pro প্ল্যান, সার্ভার Small (২ GB) · Cloudflare: ফ্রি · Resend: ফ্রি</p>
      <p className={`mb-4 rounded-xl px-3 py-2 text-sm font-semibold ${msg.c}`}>{msg.t}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Meter label="Cloudflare (ফ্রি) — দিনের রিকোয়েস্ট (৭ দিনের সর্বোচ্চ)" used={reqPeak} limit={100000} unit="/দিন" note={`আজ আনুমানিক ${bnNum(reqToday.toLocaleString('en-US'))}`} />
        <Meter label="Supabase (Pro) — ডাটাবেসের আকার" used={mb(u.db_bytes)} limit={DB_MB} unit="MB" />
        <Meter label="Resend (ফ্রি) — আজ পাঠানো ইমেইল" used={mailUsed} limit={mailLimit} unit="ইমেইল/দিন" note={mailNote} />
        <Meter label="Supabase (Pro) — মাসিক সক্রিয় ইউজার" used={u.mau} limit={MAU} unit="জন" />
        <Meter label="Supabase (Pro) — ফাইল স্টোরেজ (সার্কুলার PDF)" used={mb(u.storage_bytes)} limit={STORAGE_MB} unit="MB" />
      </div>
      <p className="mt-4 text-xs text-ink-soft">আজ {bnNum(u.visitors_today)} জন ভিজিটর, {bnNum(u.views_today)} পেজ ভিউ। Cloudflare-এর সংখ্যা পেজ ভিউ থেকে আনুমানিক হিসাব; সঠিক সংখ্যা Cloudflare ড্যাশবোর্ডে দেখা যায়। Cloudflare ৬০% পার হলে Workers Paid ($৫/মাস) নেওয়ার কথা ভাবুন। একসাথে অনেক মানুষ এলে সাইট ধীর হলে Supabase-এর সার্ভার আরও বড় করা যায়।</p>
    </section>
  );
}
