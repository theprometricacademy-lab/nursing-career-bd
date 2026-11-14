'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Spinner } from '@/components/ui';
import { bnNum } from '@/lib/circulars';

type Log = { items: { id: number; kind: string; title: string; url: string | null; send_email: boolean; send_push: boolean; test: boolean; status: string; email_sent: number; push_sent: number; created_at: string; email_queued?: number }[];
  push_devices: number; push_members: number; email_members: number; email_off: number;
  email_today?: number; email_waiting?: number; email_cap?: number; weekly_email?: boolean };

const KIND: Record<string, string> = { weekly: 'সাপ্তাহিক টেস্ট', circular: 'সার্কুলার', info: 'ঘোষণা' };

/** Send an announcement to members (bell + phone + optional email) and see what went out. */
export default function AdminNotifications() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [log, setLog] = useState<Log | null>(null);
  const [f, setF] = useState({ title: '', body: '', url: '', email: false, push: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const { data } = await sb.rpc('admin_notification_log'); setLog(data as Log); }, [sb]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  // Saturday weekly-test email on/off (the bell and phone notification always go)
  async function setWeeklyEmail(on: boolean) {
    setBusy(true);
    const { error } = await sb.from('app_settings').upsert({ key: 'notify_email', value: { weekly: on, daily_cap: log?.email_cap ?? 80 }, is_public: false });
    setBusy(false);
    setMsg(error ? error.message : on ? 'সাপ্তাহিক টেস্টের ইমেইল চালু হয়েছে।' : 'সাপ্তাহিক টেস্টের ইমেইল বন্ধ হয়েছে।');
    load();
  }

  async function send(test: boolean) {
    if (f.title.trim().length < 3) { setMsg('শিরোনাম লিখুন।'); return; }
    if (!test && !confirm(`সব ইউজারকে পাঠাবেন?${f.email ? ` (ইমেইল যাবে প্রায় ${log?.email_members ?? 0} জনের কাছে — দিনে সর্বোচ্চ ${log?.email_cap ?? 80}টি, বাকিগুলো পরের দিনগুলোতে সকালে যাবে)` : ''}`)) return;
    setBusy(true); setMsg('');
    const { error } = await sb.rpc('admin_send_notification', { p_title: f.title, p_body: f.body, p_url: f.url, p_email: f.email, p_push: f.push, p_test: test });
    setBusy(false);
    if (error) setMsg(error.message);
    else { setMsg(test ? 'শুধু আপনার কাছে পরীক্ষামূলক পাঠানো হয়েছে।' : 'পাঠানো হয়েছে।'); if (!test) setF({ title: '', body: '', url: '', email: false, push: true }); load(); }
  }

  return (
    <div>
      <PageHeader title="নোটিফিকেশন" sub="নতুন সাপ্তাহিক টেস্ট (প্রতি শনিবার সকাল ৯টা) আর নতুন সরকারি সার্কুলার নিজে থেকেই যায়। এখান থেকে নিজের ঘোষণাও পাঠাতে পারবেন।" />
      {log && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['ফোনে চালু করেছেন', `${bnNum(log.push_members)} জন`], ['ফোন/ডিভাইস', bnNum(log.push_devices)], ['ইমেইল পাবেন', `${bnNum(log.email_members)} জন`], ['ইমেইল বন্ধ করেছেন', `${bnNum(log.email_off)} জন`]].map(([a, b]) => (
            <div key={a} className="card p-3"><div className="text-xs text-ink-soft">{a}</div><div className="text-xl font-bold text-ink">{b}</div></div>
          ))}
        </div>
      )}
      {log && (
        <div className="card mb-4 space-y-2 p-4 text-sm">
          <b className="text-ink">ইমেইলের দৈনিক সীমা</b>
          <p className="text-ink-soft">ফ্রি ইমেইল প্ল্যানে দিনে ১০০টির বেশি ইমেইল যায় না। তাই স্বয়ংক্রিয় ইমেইল দিনে সর্বোচ্চ <b className="text-ink">{bnNum(log.email_cap ?? 80)}টি</b> যায়, বাকিগুলো অপেক্ষায় থেকে পরের দিন সকাল ৬:১৫-তে যায়। বাকি ২০টি পাসওয়ার্ড রিসেটের জন্য খালি রাখা হয়।</p>
          <p>আজ গেছে <b className="text-ink">{bnNum(log.email_today ?? 0)} / {bnNum(log.email_cap ?? 80)}</b> · অপেক্ষায় আছে <b className="text-ink">{bnNum(log.email_waiting ?? 0)}টি</b></p>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" disabled={busy} checked={log.weekly_email ?? true} onChange={(e) => setWeeklyEmail(e.target.checked)} />
            প্রতি শনিবারের সাপ্তাহিক টেস্টের ইমেইল পাঠান <span className="text-ink-soft">(বন্ধ থাকলেও সাইটের ঘণ্টা ও ফোনের নোটিফিকেশন যাবে)</span>
          </label>
        </div>
      )}
      <div className="card mb-5 space-y-3 p-4">
        <b className="text-ink">নতুন ঘোষণা</b>
        <input className="input" maxLength={140} placeholder="শিরোনাম (যেমন: শীতকালীন অফার আর মাত্র ৩ দিন)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input min-h-[80px]" maxLength={600} placeholder="বিস্তারিত (ঐচ্ছিক)" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <input className="input" placeholder="লিংক (ঐচ্ছিক) — যেমন /premium বা /weekly-test" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.push} onChange={(e) => setF({ ...f, push: e.target.checked })} />ফোনে নোটিফিকেশন</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.email} onChange={(e) => setF({ ...f, email: e.target.checked })} />ইমেইলেও পাঠান</label>
          <span className="text-ink-soft">সাইটের ঘণ্টায় সবসময় দেখাবে</span>
        </div>
        <p className="text-xs text-ink-soft">পরামর্শ: ইমেইল সপ্তাহে ১–২টার বেশি নয়, নইলে মানুষ বিরক্ত হয়ে বন্ধ করে দেয়।</p>
        {msg && <p className="text-sm text-mint-700">{msg}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => send(true)} className="btn-ghost">আগে শুধু আমাকে পাঠান (পরীক্ষা)</button>
          <button disabled={busy} onClick={() => send(false)} className="btn-primary"><Send className="h-4 w-4" />সবাইকে পাঠান</button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        {!log ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs text-ink-soft"><tr><th className="px-3 py-2">কবে</th><th className="px-3 py-2">ধরন</th><th className="px-3 py-2">শিরোনাম</th><th className="px-3 py-2">ফোন</th><th className="px-3 py-2">ইমেইল</th><th className="px-3 py-2">অবস্থা</th></tr></thead>
            <tbody className="divide-y divide-brand-50">
              {log.items.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{new Date(n.created_at).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                  <td className="px-3 py-2 text-xs">{KIND[n.kind] ?? n.kind}{n.test && ' · পরীক্ষা'}</td>
                  <td className="px-3 py-2">{n.title}</td>
                  <td className="px-3 py-2">{n.send_push ? bnNum(n.push_sent) : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{n.send_email ? <>{bnNum(n.email_sent)}{(n.email_queued ?? 0) > 0 && <span className="text-xs text-amber-700"> (+{bnNum(n.email_queued ?? 0)} অপেক্ষায়)</span>}</> : '—'}</td>
                  <td className="px-3 py-2 text-xs text-ink-soft">{n.status === 'sent' ? 'পাঠানো হয়েছে' : n.status === 'pending' || n.status === 'sending' ? 'পাঠানো হচ্ছে…' : n.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
