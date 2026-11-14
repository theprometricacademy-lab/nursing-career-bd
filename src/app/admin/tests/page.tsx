'use client';
import { useCallback, useEffect, useState } from 'react';
import { Crown, Search } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type Row = {
  id: string; user_id: string; full_name: string | null; email: string | null; phone: string | null; mode: string; title: string | null;
  week_start: string | null; started_at: string; submitted_at: string | null; total_questions: number; correct: number; wrong: number; skipped: number;
  score: number; max_score: number; seconds: number; premium: boolean;
};
type Data = { total: number; people: number; avg_percent: number | null; rows: Row[] };
const PAGE = 50;

/** Every submitted test: who took it, how many questions, how many right / wrong / skipped, and the score. */
export default function TestsAdmin() {
  const L = useL();
  const { num } = useApp();
  const sb = supabaseBrowser();
  const [data, setData] = useState<Data | null>(null);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');
  const [page, setPage] = useState(0);
  const [err, setErr] = useState('');

  const MODES: Record<string, string> = {
    weekly: L('সাপ্তাহিক টেস্ট', 'Weekly test'), custom: L('অনুশীলন পরীক্ষা', 'Practice exam'), daily: L('ডেইলি কুইজ', 'Daily quiz'),
    pyq: L('বিগত সালের প্রশ্ন', 'Past paper'), mock: L('মক টেস্ট', 'Mock test'),
  };
  const TONE: Record<string, string> = {
    weekly: 'bg-mint-100 text-mint-700', custom: 'bg-brand-100 text-brand-700', daily: 'bg-amber-100 text-amber-800',
    pyq: 'bg-blush-100 text-blush-700', mock: 'bg-ink text-white',
  };

  const load = useCallback(async () => {
    const { data: d, error } = await sb.rpc('admin_test_attempts', { p_search: q.trim() || null, p_mode: mode || null, p_limit: PAGE, p_offset: page * PAGE });
    if (error) setErr(error.message); else { setErr(''); setData(d as Data); }
  }, [sb, q, mode, page]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  // 'আজ ৮:৪১ AM' / 'গতকাল …' / '১২ নভে …' (Bangladesh time)
  const when = (iso: string) => {
    const d = new Date(iso);
    const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const time = d.toLocaleTimeString(L('bn-BD', 'en-GB'), { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' });
    const label = day(d) === day(new Date()) ? L('আজ', 'Today') : day(d) === day(new Date(Date.now() - 86400000)) ? L('গতকাল', 'Yesterday')
      : d.toLocaleDateString(L('bn-BD', 'en-GB'), { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' });
    return `${label} ${time}`;
  };
  const took = (s: number) => (s < 60 ? `${num(s)} ${L('সে', 's')}` : `${num(Math.floor(s / 60))} ${L('মি', 'm')} ${num(s % 60)} ${L('সে', 's')}`);

  return (
    <div className="space-y-4">
      <PageHeader title={L('জমা হওয়া টেস্ট', 'Submitted tests')}
        sub={L('কে কোন টেস্ট দিয়েছেন, কয়টা প্রশ্ন পেয়েছেন, কয়টা ঠিক আর কয়টা ভুল হয়েছে।', 'Who took which test, how many questions, how many right and wrong.')}
        right={<select className="input w-48" value={mode} onChange={(e) => { setMode(e.target.value); setPage(0); }}>
          <option value="">{L('সব ধরনের টেস্ট', 'All test types')}</option>
          {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>} />
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
        <input className="input pl-9" placeholder={L('নাম, ইমেইল বা ফোন দিয়ে খুঁজুন', 'Search by name, email or phone')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!data ? <Spinner /> : (<>
        <div className="grid grid-cols-3 gap-3">
          {[[L('মোট টেস্ট', 'Tests'), num(data.total)], [L('কতজন দিয়েছেন', 'People'), num(data.people)], [L('গড় নম্বর', 'Average'), data.avg_percent === null ? '—' : `${num(data.avg_percent)}%`]].map(([a, b]) => (
            <div key={a} className="card p-3"><div className="text-xs text-ink-soft">{a}</div><div className="text-xl font-bold text-ink">{b}</div></div>
          ))}
        </div>
        <div className="card overflow-x-auto">
          {data.rows.length === 0 ? <p className="p-6 text-center text-sm text-ink-soft">{L('কোনো টেস্ট পাওয়া যায়নি।', 'No tests found.')}</p> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-xs text-ink-soft">
                <tr><th className="px-3 py-2">{L('কে দিয়েছেন', 'Who')}</th><th className="px-3 py-2">{L('কোন টেস্ট', 'Test')}</th><th className="px-3 py-2">{L('প্রশ্ন', 'Questions')}</th><th className="px-3 py-2">{L('ফলাফল', 'Result')}</th><th className="px-3 py-2">{L('নম্বর', 'Score')}</th><th className="px-3 py-2">{L('সময় লেগেছে', 'Time taken')}</th><th className="px-3 py-2">{L('কখন জমা দিয়েছেন', 'Submitted')}</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {data.rows.map((r) => {
                  const answered = r.correct + r.wrong;
                  const pct = r.max_score > 0 ? Math.round((Number(r.score) * 100) / Number(r.max_score)) : null;
                  const contact = r.email && !r.email.includes('@phone.') ? r.email : r.phone || '';
                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap font-medium text-ink">{r.full_name || '—'}{r.premium && <Crown className="h-4 w-4 text-blush-600" />}</div>
                        <div className="text-xs text-ink-soft">{contact}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`chip ${TONE[r.mode] ?? 'bg-brand-100 text-brand-700'}`}>{MODES[r.mode] ?? r.mode}</span>
                        <div className="mt-0.5 max-w-[16rem] truncate text-xs text-ink-soft" title={r.title ?? ''}>{r.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="font-semibold text-ink">{num(r.total_questions)}{L('টি প্রশ্ন', ' Qs')}</div>
                        <div className="text-xs text-ink-soft">{L('উত্তর দিয়েছেন', 'answered')} {num(answered)}{L('টি', '')}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        <div><span className="font-semibold text-mint-700">✓ {num(r.correct)} {L('ঠিক', 'right')}</span><span className="text-ink-soft"> · </span><span className="font-semibold text-red-600">✗ {num(r.wrong)} {L('ভুল', 'wrong')}</span></div>
                        <div className="text-ink-soft">{num(r.skipped)}{L('টি বাদ দিয়েছেন', ' skipped')}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className={`font-bold ${pct === null ? 'text-ink' : pct >= 70 ? 'text-mint-700' : pct >= 40 ? 'text-ink' : 'text-red-600'}`}>{pct === null ? '—' : `${num(pct)}%`}</div>
                        <div className="text-xs text-ink-soft">{num(Number(r.score))} / {num(Number(r.max_score))}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{took(r.seconds)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{r.submitted_at ? when(r.submitted_at) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm">{num(page + 1)} / {num(Math.max(1, Math.ceil(data.total / PAGE)))}</span>
          <button className="btn-ghost" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </>)}
    </div>
  );
}
