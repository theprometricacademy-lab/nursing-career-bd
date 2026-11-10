'use client';
import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { bnNum } from '@/lib/circulars';

type U = { db_bytes: number; storage_bytes: number; views_today: number; visitors_today: number; max_views_day_7d: number; email_signups_today: number; mau: number };

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
  useEffect(() => { supabaseBrowser().rpc('admin_usage').then(({ data }) => setU((data as U) ?? null)); }, []);
  if (!u) return null;
  const mb = (b: number) => Math.round(b / 1048576);
  const reqToday = u.views_today * REQ_PER_VIEW, reqPeak = u.max_views_day_7d * REQ_PER_VIEW;
  const worst = Math.max(reqPeak / 100000, mb(u.db_bytes) / 500, u.email_signups_today / 100, u.mau / 50000, mb(u.storage_bytes) / 1024);
  const msg = worst >= 0.8 ? { t: 'সীমার খুব কাছে! এখনই পেইড প্ল্যান নেওয়ার কথা ভাবুন।', c: 'bg-red-50 text-red-700' }
    : worst >= 0.6 ? { t: 'সীমার কাছাকাছি যাচ্ছে — নজর রাখুন।', c: 'bg-amber-50 text-amber-700' }
    : { t: 'সব ঠিক আছে — ফ্রি প্ল্যানেই চলবে।', c: 'bg-mint-50 text-mint-700' };
  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink"><Gauge className="h-5 w-5 text-brand-600" />সার্ভার ব্যবহার (ফ্রি প্ল্যানের সীমা)</h2>
      <p className={`mb-4 rounded-xl px-3 py-2 text-sm font-semibold ${msg.c}`}>{msg.t}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Meter label="Cloudflare — দিনের রিকোয়েস্ট (৭ দিনের সর্বোচ্চ)" used={reqPeak} limit={100000} unit="/দিন" note={`আজ আনুমানিক ${bnNum(reqToday.toLocaleString('en-US'))}`} />
        <Meter label="Supabase — ডাটাবেসের আকার" used={mb(u.db_bytes)} limit={500} unit="MB" />
        <Meter label="Resend — আজ ইমেইল সাইনআপ" used={u.email_signups_today} limit={100} unit="ইমেইল/দিন" note="মোবাইল/Google সাইনআপে ইমেইল লাগে না" />
        <Meter label="Supabase — মাসিক সক্রিয় ইউজার" used={u.mau} limit={50000} unit="জন" />
        <Meter label="Supabase — ফাইল স্টোরেজ (সার্কুলার PDF)" used={mb(u.storage_bytes)} limit={1024} unit="MB" />
      </div>
      <p className="mt-4 text-xs text-ink-soft">আজ {bnNum(u.visitors_today)} জন ভিজিটর, {bnNum(u.views_today)} পেজ ভিউ। Cloudflare-এর সংখ্যা পেজ ভিউ থেকে আনুমানিক হিসাব; সঠিক সংখ্যা Cloudflare ড্যাশবোর্ডে দেখা যায়। ৬০% পার হলে Cloudflare Workers Paid ($৫/মাস), ৮০% পার হলে Supabase Pro ($২৫/মাস) নেওয়ার কথা ভাবুন।</p>
    </section>
  );
}
