'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader } from '@/components/ui';

type Report = {
  id: number; question_id: number; reason: string; note: string | null; status: 'open' | 'resolved' | 'rejected'; created_at: string;
  questions: { code: string; question_bn: string | null; options_bn: string[] | null; correct_option: number; explanation_bn: string | null } | null;
};
const REASON: Record<string, string> = {
  wrong_answer: 'সঠিক উত্তর ভুল', wrong_option: 'অপশনে সমস্যা', typo: 'বানান/লেখার ভুল', wrong_explanation: 'ব্যাখ্যা ভুল', other: 'অন্য সমস্যা',
};
const L4 = ['ক', 'খ', 'গ', 'ঘ'];

export default function AdminReportsPage() {
  const { num } = useApp();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [tab, setTab] = useState<'open' | 'resolved' | 'rejected'>('open');
  const [rows, setRows] = useState<Report[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await sb.from('question_reports')
      .select('id, question_id, reason, note, status, created_at, questions(code, question_bn, options_bn, correct_option, explanation_bn)')
      .eq('status', tab).order('created_at', { ascending: false }).limit(100);
    if (error) setErr(error.message); else setRows(data as unknown as Report[]);
    const c: Record<string, number> = {};
    for (const s of ['open', 'resolved', 'rejected']) {
      const { count } = await sb.from('question_reports').select('id', { count: 'exact', head: true }).eq('status', s);
      c[s] = count ?? 0;
    }
    setCounts(c);
  }, [sb, tab]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: 'resolved' | 'rejected' | 'open') {
    const { error } = await sb.from('question_reports').update({ status, resolved_at: status === 'open' ? null : new Date().toISOString() }).eq('id', id);
    if (error) setErr(error.message); else load();
  }

  return (
    <div>
      <PageHeader title="প্রশ্নের রিপোর্ট" sub="ইউজাররা যেসব প্রশ্নে ভুল পেয়ে রিপোর্ট করেছেন। প্রশ্ন ঠিক করে “সমাধান হয়েছে” চাপুন।" />
      <div className="mb-4 flex gap-2">
        {([['open', 'নতুন'], ['resolved', 'সমাধান হয়েছে'], ['rejected', 'বাতিল']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-brand-100'}`}>
            {l} {counts[k] !== undefined && <span className="ml-1 opacity-70">({num(counts[k])})</span>}
          </button>
        ))}
      </div>
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {rows === null ? <p className="text-sm text-ink-soft">লোড হচ্ছে…</p> : rows.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft"><Flag className="mx-auto mb-2 h-8 w-8" />এই তালিকায় কোনো রিপোর্ট নেই।</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const q = r.questions;
            return (
              <article key={r.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip bg-red-50 text-red-700"><Flag className="h-3.5 w-3.5" />{REASON[r.reason] ?? r.reason}</span>
                  <b className="text-brand-700">{q?.code}</b>
                  <span className="text-ink-soft">{new Date(r.created_at).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })}</span>
                </div>
                {r.note && <p className="mb-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>ইউজারের মন্তব্য:</b> {r.note}</p>}
                {q && (
                  <div className="rounded-xl bg-brand-50/50 p-3 text-sm">
                    <p className="font-semibold text-ink">{q.question_bn}</p>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {(q.options_bn ?? []).map((o, i) => (
                        <li key={i} className={`rounded-lg px-2 py-1 ${i === q.correct_option ? 'bg-mint-100 font-semibold text-mint-800' : 'text-ink-soft'}`}>{L4[i]}) {o}{i === q.correct_option && ' ✔'}</li>
                      ))}
                    </ul>
                    {q.explanation_bn && <p className="mt-2 text-ink-soft"><b className="text-ink">ব্যাখ্যা:</b> {q.explanation_bn}</p>}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {q && <Link href={`/admin/questions?q=${encodeURIComponent(q.code)}`} className="btn-ghost !py-1.5 text-sm"><Pencil className="h-4 w-4" />প্রশ্ন এডিট করুন</Link>}
                  {r.status !== 'resolved' && <button onClick={() => setStatus(r.id, 'resolved')} className="btn-success !py-1.5 text-sm"><CheckCircle2 className="h-4 w-4" />সমাধান হয়েছে</button>}
                  {r.status === 'open' && <button onClick={() => setStatus(r.id, 'rejected')} className="btn-ghost !py-1.5 text-sm"><XCircle className="h-4 w-4" />ভুল রিপোর্ট / বাতিল</button>}
                  {r.status !== 'open' && <button onClick={() => setStatus(r.id, 'open')} className="btn-ghost !py-1.5 text-sm">আবার খুলুন</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
