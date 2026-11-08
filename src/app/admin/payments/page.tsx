'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type P = {
  id: string; user_id: string; plan: string; mock_test_id: number | null; amount: number; original_amount: number; gateway: string;
  status: string; gateway_ref: string | null; gateway_txn_id: string | null; created_at: string; verified_at: string | null;
  profiles?: { full_name: string | null; phone: string | null } | null;
};
const TONE: Record<string, string> = {
  paid: 'bg-mint-100 text-mint-700', pending: 'bg-brand-100 text-brand-700', failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-white text-ink-soft ring-1 ring-brand-100', refunded: 'bg-blush-100 text-blush-700',
};

export default function PaymentsAdmin() {
  const L = useL();
  const { num } = useApp();
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<P[] | null>(null);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    let q = sb.from('payments').select('*').order('created_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) { setErr(error.message); return; }
    const list = (data ?? []) as P[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, full_name, phone').in('id', ids);
      const m = new Map((profs ?? []).map((p: { id: string; full_name: string | null; phone: string | null }) => [p.id, p]));
      list.forEach((p) => { p.profiles = m.get(p.user_id) ?? null; });
    }
    setRows(list);
  }, [sb, status]);
  useEffect(() => { load(); }, [load]);

  async function refund(p: P) {
    if (!confirm(L('এই পেমেন্টকে "refunded" চিহ্নিত করে সংশ্লিষ্ট অ্যাক্সেস বাতিল করবেন? (টাকা ফেরত গেটওয়ে থেকে আলাদাভাবে দিতে হবে)', 'Mark as refunded and revoke the access it granted? (Send the money back from the gateway separately.)'))) return;
    const e1 = (await sb.from('payments').update({ status: 'refunded' }).eq('id', p.id)).error;
    const e2 = (await sb.from('subscriptions').update({ status: 'revoked' }).eq('payment_id', p.id)).error;
    setErr(e1?.message || e2?.message || ''); load();
  }

  const total = (rows ?? []).filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader title={L('পেমেন্ট', 'Payments')} sub={`${L('এই তালিকায় সফল', 'Paid in this list')}: ৳${num(total)}`}
        right={<select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{L('সব স্ট্যাটাস', 'All statuses')}</option>
          {Object.keys(TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>} />
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!rows ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs text-ink-soft">
              <tr><th className="px-3 py-2">{L('সময়', 'Date')}</th><th className="px-3 py-2">{L('ইউজার', 'User')}</th><th className="px-3 py-2">{L('প্ল্যান', 'Plan')}</th><th className="px-3 py-2">{L('পরিমাণ', 'Amount')}</th><th className="px-3 py-2">Gateway</th><th className="px-3 py-2">Txn</th><th className="px-3 py-2">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{p.profiles?.full_name || '—'}<div className="text-xs text-ink-soft">{p.profiles?.phone}</div></td>
                  <td className="px-3 py-2">{p.plan}{p.mock_test_id ? ` #${p.mock_test_id}` : ''}</td>
                  <td className="px-3 py-2">৳{num(p.amount)}{Number(p.original_amount) !== Number(p.amount) && <span className="ml-1 text-xs text-ink-soft line-through">৳{num(p.original_amount)}</span>}</td>
                  <td className="px-3 py-2">{p.gateway}</td>
                  <td className="px-3 py-2 text-xs">{p.gateway_txn_id || '—'}</td>
                  <td className="px-3 py-2"><span className={`chip ${TONE[p.status] ?? ''}`}>{p.status}</span></td>
                  <td className="px-3 py-2 text-right">{p.status === 'paid' && <button className="text-xs text-red-600 hover:underline" onClick={() => refund(p)}>{L('রিফান্ড', 'Refund')}</button>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-ink-soft">—</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
