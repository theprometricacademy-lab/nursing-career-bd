'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, Clock, Crown, Eye, RefreshCw, Users } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Modal, PageHeader, Spinner } from '@/components/ui';
import { bnNum } from '@/lib/circulars';

type Session = {
  session_id: string; visitor: string; visitor_id?: string; name: string | null; email: string | null; started: string; last_seen: string;
  views: number; visits?: number; seconds?: number; current_path: string; referrer: string | null; device: string | null; online: boolean;
  user_id?: string | null; phone?: string | null; joined?: string | null; premium?: boolean; practiced?: number; practice_correct?: number; tests?: number;
};
type Data = {
  online: number; today_visitors: number; today_views: number; today_avg_seconds: number; week_visitors: number;
  sessions: Session[]; top_pages: { path: string; views: number; avg_s: number }[]; top_sources: { source: string; sessions: number }[];
};
type View = { path: string; started_at: string; seconds: number };

const PAGE_BN: [RegExp, string][] = [
  [/^\/$/, 'হোম'], [/^\/question-bank/, 'প্রশ্নব্যাংক'], [/^\/mock-tests/, 'মডেল টেস্ট'], [/^\/exam\//, 'পরীক্ষা দিচ্ছেন'],
  [/^\/result/, 'ফলাফল'], [/^\/premium/, 'প্রিমিয়াম পেজ'], [/^\/payment/, 'পেমেন্ট'], [/^\/circulars\/./, 'সার্কুলারের বিস্তারিত'],
  [/^\/circulars/, 'সার্কুলার তালিকা'], [/^\/mcq\//, 'বিষয়ের MCQ'], [/^\/nursing-mcq/, 'নার্সিং MCQ'], [/^\/senior-staff-nurse/, 'সিনিয়র স্টাফ নার্স গাইড'],
  [/^\/subject-practice/, 'বিষয়ভিত্তিক অনুশীলন'], [/^\/previous-questions/, 'বিগত প্রশ্ন'], [/^\/daily-quiz/, 'ডেইলি কুইজ'], [/^\/dashboard/, 'ড্যাশবোর্ড'],
  [/^\/signup/, 'সাইনআপ'], [/^\/login/, 'লগইন'], [/^\/profile/, 'প্রোফাইল'], [/^\/bookmarks/, 'বুকমার্ক'], [/^\/wrong-answers/, 'ভুল উত্তর'],
];
const pageName = (p: string) => PAGE_BN.find(([r]) => r.test(p.split('?')[0]))?.[1] ?? p.split('?')[0];

function dur(sec: number) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${bnNum(sec)} সেকেন্ড`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return `${bnNum(m)} মি ${s ? bnNum(s) + ' সে' : ''}`.trim();
  return `${bnNum(Math.floor(m / 60))} ঘ ${bnNum(m % 60)} মি`;
}
const dhakaDay = (ms: number) => new Date(ms + 6 * 3600 * 1000).toISOString().slice(0, 10);
const timeBn = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 6 * 3600 * 1000);
  return bnNum(`${String(d.getUTCHours() % 12 || 12)}:${String(d.getUTCMinutes()).padStart(2, '0')}`) + (d.getUTCHours() < 12 ? ' AM' : ' PM');
};
// 'আজ ৮:৪১ AM' / 'গতকাল ১০:০৫ PM' (Bangladesh time)
const when = (iso: string) => {
  const t = new Date(iso).getTime(), d = dhakaDay(t);
  return `${d === dhakaDay(Date.now()) ? 'আজ' : d === dhakaDay(Date.now() - 86400000) ? 'গতকাল' : bnNum(d.slice(5))} ${timeBn(iso)}`;
};

export default function VisitorsAdmin() {
  const sb = supabaseBrowser();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [onlyMembers, setOnlyMembers] = useState(false);
  const [sel, setSel] = useState<Session | null>(null);
  const [views, setViews] = useState<View[] | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await sb.rpc('admin_visitors', { p_tz: 'Asia/Dhaka' });
    if (error) setErr(error.message); else { setErr(''); setData(data as Data); }
  }, [sb]);

  useEffect(() => { load(); const i = setInterval(() => { load(); setTick((x) => x + 1); }, 15000); return () => clearInterval(i); }, [load]);

  async function open(s: Session) {
    setSel(s); setViews(null);
    // everything this person did in the last 24 hours, across all their tab visits
    const { data } = s.visitor_id
      ? await sb.rpc('admin_visitor_views', { p_visitor: s.visitor_id })
      : await sb.rpc('admin_session_views', { p_session: s.session_id });
    setViews((data as View[]) ?? []);
  }

  if (!data) return err ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p> : <Spinner />;
  const list = data.sessions.filter((s) => (!onlyOnline || s.online) && (!onlyMembers || !!(s.name || s.email)));

  const stat = (icon: React.ReactNode, label: string, value: string, tone: string) => (
    <div className="card p-4">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${tone}`}>{icon}</div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );

  return (
    <div className="space-y-4" data-tick={tick}>
      <PageHeader title="লাইভ ভিজিটর" sub="প্রতি ১৫ সেকেন্ডে নিজে থেকে হালনাগাদ হয়। গত ২ মিনিটে সক্রিয় থাকলে 'অনলাইন' ধরা হয়। একজন মানুষ একটাই সারিতে দেখায়।"
        right={<button className="btn-ghost" onClick={load}><RefreshCw className="h-4 w-4" />রিফ্রেশ</button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card relative overflow-hidden bg-gradient-to-br from-mint-500 to-mint-600 p-4 text-white">
          <span className="absolute right-3 top-3 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-white" /></span>
          <Activity className="mb-2 h-6 w-6" />
          <div className="text-3xl font-extrabold">{bnNum(data.online)}</div>
          <div className="text-xs text-white/90">এখন অনলাইনে</div>
        </div>
        {stat(<Users className="h-5 w-5" />, 'আজ মোট ভিজিটর', bnNum(data.today_visitors), 'bg-brand-100 text-brand-700')}
        {stat(<Eye className="h-5 w-5" />, 'আজ পেজ ভিউ', bnNum(data.today_views), 'bg-blush-100 text-blush-700')}
        {stat(<Clock className="h-5 w-5" />, 'আজ গড়ে কতক্ষণ থাকছেন', dur(data.today_avg_seconds), 'bg-amber-100 text-amber-700')}
        {stat(<Users className="h-5 w-5" />, 'গত ৭ দিনে ভিজিটর', bnNum(data.week_visitors), 'bg-violet-100 text-violet-700')}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100 p-4">
          <h2 className="font-semibold text-ink">ভিজিটররা কী করছেন (গত ২৪ ঘণ্টা)</h2>
          <span className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />শুধু অনলাইন</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={onlyMembers} onChange={(e) => setOnlyMembers(e.target.checked)} />শুধু অ্যাকাউন্টধারী</label>
          </span>
        </div>
        {list.length === 0 ? <p className="p-6 text-center text-sm text-ink-soft">এখনো কোনো ভিজিটর নেই।</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-xs text-ink-soft">
                <tr><th className="px-3 py-2">ভিজিটর</th><th className="px-3 py-2">এখন কোথায়</th><th className="px-3 py-2">কতটা ঘুরেছেন</th><th className="px-3 py-2">প্র্যাকটিস</th><th className="px-3 py-2">টেস্ট</th><th className="px-3 py-2">কোথা থেকে</th><th className="px-3 py-2">ডিভাইস</th><th className="px-3 py-2">প্রথম এসেছিলেন</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {list.map((s) => {
                  const member = !!(s.name || s.email);
                  const contact = s.email && !s.email.includes('@phone.') ? s.email : s.phone || '';
                  const isNew = !!s.joined && Date.now() - new Date(s.joined).getTime() < 86400000;
                  const done = s.practiced ?? 0, right = s.practice_correct ?? 0;
                  return (
                    <tr key={s.visitor_id ?? s.session_id} onClick={() => open(s)} className="cursor-pointer hover:bg-brand-50/60">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap font-medium text-ink">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.online ? 'bg-mint-500' : 'bg-slate-300'}`} />
                          {s.name || s.email || `অতিথি #${s.visitor}`}
                          {s.premium && <Crown className="h-4 w-4 text-blush-600" />}
                          {isNew && <span className="chip bg-mint-100 text-mint-700">নতুন অ্যাকাউন্ট</span>}
                        </div>
                        <div className="pl-4 text-xs text-ink-soft">{member ? contact : 'অ্যাকাউন্ট খোলেননি'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-[14rem] truncate font-semibold text-ink">{pageName(s.current_path)}</div>
                        <div className="whitespace-nowrap text-xs text-ink-soft">{s.online ? 'এখন অনলাইনে' : `শেষ দেখা: ${when(s.last_seen)}`}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="font-semibold text-ink">{bnNum(s.views)}টি পেজ · {dur(s.seconds ?? (new Date(s.last_seen).getTime() - new Date(s.started).getTime()) / 1000)}</div>
                        {(s.visits ?? 1) > 1 && <div className="text-xs text-ink-soft">{bnNum(s.visits ?? 1)} বার এসেছেন</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {!member ? <span className="text-ink-soft">—</span> : done > 0 ? (<>
                          <div className="font-semibold text-ink">{bnNum(done)}টি প্রশ্ন</div>
                          <div className="text-xs">
                            <span className="font-semibold text-mint-700">✓ {bnNum(right)} ঠিক</span>
                            <span className="text-ink-soft"> · </span>
                            <span className="font-semibold text-red-600">✗ {bnNum(done - right)} ভুল</span>
                            <span className="text-ink-soft"> · {bnNum(Math.round((right / done) * 100))}%</span>
                          </div>
                        </>) : <span className="text-ink-soft">০</span>}
                      </td>
                      <td className="px-3 py-2">{member ? bnNum(s.tests ?? 0) : <span className="text-ink-soft">—</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2">{s.referrer || 'সরাসরি'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-soft">{s.device || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{when(s.started)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-brand-100 p-3 text-xs text-ink-soft">কোনো সারিতে চাপ দিলে ওই মানুষ কোন কোন পেজ দেখেছেন, সব দেখা যাবে।</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-ink">আজ সবচেয়ে বেশি দেখা পেজ</h2>
          <table className="w-full text-sm"><tbody className="divide-y divide-brand-100">
            {data.top_pages.map((p) => (
              <tr key={p.path}><td className="py-2 pr-2 text-ink">{pageName(p.path)}<span className="block text-xs text-ink-soft">{p.path}</span></td>
                <td className="py-2 text-right text-ink-soft">{bnNum(p.views)} বার<span className="block text-xs">গড়ে {dur(p.avg_s)}</span></td></tr>
            ))}
            {data.top_pages.length === 0 && <tr><td className="py-3 text-ink-soft">—</td></tr>}
          </tbody></table>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-ink">ভিজিটর কোথা থেকে আসছেন (৭ দিন)</h2>
          <table className="w-full text-sm"><tbody className="divide-y divide-brand-100">
            {data.top_sources.map((s) => (
              <tr key={s.source}><td className="py-2 text-ink">{s.source}</td><td className="py-2 text-right text-ink-soft">{bnNum(s.sessions)} ভিজিট</td></tr>
            ))}
            {data.top_sources.length === 0 && <tr><td className="py-3 text-ink-soft">—</td></tr>}
          </tbody></table>
          <p className="mt-2 text-xs text-ink-soft">Facebook-এ লিংক দিলে শেষে <code>?utm_source=facebook</code> যোগ করলে উৎস আরও নিখুঁত দেখাবে।</p>
        </div>
      </div>

      <Modal wide open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-ink">{sel.name || sel.email || `অতিথি #${sel.visitor}`}</h3>
            <p className="text-sm text-ink-soft">{sel.device || ''} · উৎস: {sel.referrer || 'সরাসরি'} · শুরু {timeBn(sel.started)}{(sel.visits ?? 1) > 1 && ` · গত ২৪ ঘণ্টায় ${bnNum(sel.visits ?? 1)} বার এসেছেন`}</p>
            {!views ? <Spinner /> : (
              <ol className="max-h-[60vh] space-y-2 overflow-y-auto">
                {views.map((v, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-brand-50/60 p-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{bnNum(i + 1)}</span>
                    <span className="flex-1"><b className="text-ink">{pageName(v.path)}</b><span className="block break-all text-xs text-ink-soft">{v.path}</span></span>
                    <span className="text-right text-xs text-ink-soft">{timeBn(v.started_at)}<span className="block font-semibold text-ink">{dur(v.seconds)}</span></span>
                  </li>
                ))}
              </ol>
            )}
            <button className="btn-ghost w-full" onClick={() => setSel(null)}>বন্ধ করুন</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
