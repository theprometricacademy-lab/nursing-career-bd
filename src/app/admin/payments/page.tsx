'use client';
import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type P = {
  id: string; user_id: string; plan: string; mock_test_id: number | null; amount: number; original_amount: number; gateway: string;
  status: string; gateway_ref: string | null; gateway_txn_id: string | null; created_at: string; verified_at: string | null;
  gateway_payload?: { method?: string; sender?: string; paid_to?: string; auto_approved?: boolean; checked_at?: string; offer?: string; code?: string } | null;
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
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  // wait until typing pauses; only letters/digits are kept (TrxIDs and phone numbers)
  useEffect(() => { const t = setTimeout(() => setTerm(search.replace(/[^A-Za-z0-9]/g, '').toUpperCase()), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    let q = sb.from('payments').select('*').order('created_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    if (term) q = q.or(`gateway_txn_id.ilike.*${term}*,gateway_payload->>sender.ilike.*${term}*`);
    const { data, error } = await q;
    if (error) { setErr(error.message); return; }
    const list = (data ?? []) as P[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, full_name, phone').in('id', ids);
      const m = new Map((profs ?? []).map((p: { id: string; full_name: string | null; phone: string | null }) => [p.id, p]));
      list.forEach((p) => { p.profiles = (m.get(p.user_id) as P['profiles']) ?? null; });
    }
    setRows(list);
  }, [sb, status, term]);
  useEffect(() => { load(); }, [load]);

  async function refund(p: P) {
    if (!confirm(L('এই পেমেন্টকে "refunded" চিহ্নিত করে সংশ্লিষ্ট অ্যাক্সেস বাতিল করবেন? (টাকা ফেরত গেটওয়ে থেকে আলাদাভাবে দিতে হবে)', 'Mark as refunded and revoke the access it granted? (Send the money back from the gateway separately.)'))) return;
    const e1 = (await sb.from('payments').update({ status: 'refunded' }).eq('id', p.id)).error;
    const e2 = (await sb.from('subscriptions').update({ status: 'revoked' }).eq('payment_id', p.id)).error;
    setErr(e1?.message || e2?.message || ''); load();
  }

  async function review(p: P, approve: boolean) {
    const ok = approve && p.status === 'failed'
      ? confirm(L(`এই পেমেন্ট আগে বাতিল করা হয়েছিল। TrxID ${p.gateway_txn_id} (৳${p.amount}) আপনার অ্যাপে মিলেছে? অনুমোদন দিলে এখনই প্রিমিয়াম চালু হবে।`, `This payment was rejected earlier. Did TrxID ${p.gateway_txn_id} (৳${p.amount}) match? Approving activates premium now.`))
      : approve
      ? confirm(L(`TrxID ${p.gateway_txn_id} আপনার ${p.gateway_payload?.method === 'nagad' ? 'Nagad' : 'bKash'} অ্যাপে ৳${p.amount} হিসেবে মিলেছে? অনুমোদন দিলে সাথে সাথে প্রিমিয়াম চালু হবে।`, `Did TrxID ${p.gateway_txn_id} match ৳${p.amount} in your app? Approving activates premium immediately.`))
      : confirm(L('এই পেমেন্ট বাতিল করবেন?', 'Reject this payment?'));
    if (!ok) return;
    const { error } = await sb.rpc('admin_review_payment', { p_payment: p.id, p_approve: approve, p_note: null });
    setErr(error ? error.message : ''); load();
  }

  async function check(p: P, genuine: boolean) {
    const ok = genuine
      ? confirm(L(`TrxID ${p.gateway_txn_id} আপনার ${p.gateway_payload?.method === 'nagad' ? 'Nagad' : 'bKash'} অ্যাপে ৳${p.amount} হিসেবে মিলেছে?`, `Did TrxID ${p.gateway_txn_id} match ৳${p.amount} in your app?`))
      : confirm(L('এই TrxID ভুয়া? নিশ্চিত করলে এই ইউজারের প্রিমিয়াম সাথে সাথে বন্ধ হবে, আর পরেরবার তার পেমেন্ট আর স্বয়ংক্রিয়ভাবে চালু হবে না।', 'Is this TrxID fake? Premium is revoked at once, and this user\'s future payments will need manual approval.'));
    if (!ok) return;
    const { error } = await sb.rpc('admin_check_auto_payment', { p_payment: p.id, p_genuine: genuine });
    setErr(error ? error.message : ''); load();
  }

  const pendingManual = (rows ?? []).filter((r) => r.gateway === 'manual' && r.status === 'pending');
  const toCheck = (rows ?? []).filter((r) => r.gateway === 'manual' && r.status === 'paid' && r.gateway_payload?.auto_approved && !r.gateway_payload?.checked_at);
  const total = (rows ?? []).filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader title={L('পেমেন্ট', 'Payments')} sub={`${L('এই তালিকায় সফল', 'Paid in this list')}: ৳${num(total)}`}
        right={<select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{L('সব স্ট্যাটাস', 'All statuses')}</option>
          {Object.keys(TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>} />
      <div className="card flex items-center gap-2 p-3">
        <Search className="h-5 w-5 shrink-0 text-ink-soft" />
        <input className="input !border-0 !shadow-none font-mono uppercase" inputMode="text" autoCapitalize="characters"
          placeholder={L('TrxID বা যে নম্বর থেকে পাঠিয়েছে — লিখে খুঁজুন', 'Search by TrxID or sender number')}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="btn-ghost !px-2 !py-1.5" onClick={() => setSearch('')} aria-label="clear"><X className="h-4 w-4" /></button>}
      </div>
      {term && rows && (
        <p className={`rounded-xl p-3 text-sm ${rows.length ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-800'}`}>
          {rows.length
            ? L(`"${term}" — ${num(rows.length)}টি পেমেন্ট পাওয়া গেছে${pendingManual.length ? ` (${num(pendingManual.length)}টি অনুমোদনের অপেক্ষায় — নিচে অনুমোদন দিন)` : ''}।`, `"${term}" — ${rows.length} payment(s) found${pendingManual.length ? `, ${pendingManual.length} awaiting approval below` : ''}.`)
            : L(`"${term}" দিয়ে কোনো পেমেন্ট পাওয়া যায়নি — শিক্ষার্থী এখনো TrxID জমা দেয়নি বা ভুল লিখেছে।`, `No payment found for "${term}".`)}
        </p>
      )}
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {toCheck.length > 0 && (
        <section className="card border-amber-300 p-4">
          <h2 className="mb-1 font-semibold text-ink">{L('স্বয়ংক্রিয়ভাবে চালু হয়েছে — বিকাশ/নগদে মিলিয়ে দেখুন', 'Auto-activated — check in bKash/Nagad')} ({num(toCheck.length)})</h2>
          <p className="mb-3 text-xs text-ink-soft">{L('এরা TrxID দিতেই প্রিমিয়াম পেয়েছে। আপনার অ্যাপে TrxID ও টাকা মিললে "মিলেছে" চাপুন; না মিললে "ভুয়া" চাপুন — প্রিমিয়াম সাথে সাথে বন্ধ হবে।', 'These got Premium on submitting a TrxID. Press "Matched" if it is in your app, or "Fake" to revoke at once.')}</p>
          <div className="space-y-2">
            {toCheck.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.profiles?.full_name || '—'} <span className="text-xs font-normal text-ink-soft">{p.profiles?.phone}</span></div>
                  <div className="text-xs text-ink-soft">
                    {p.gateway_payload?.method === 'nagad' ? 'Nagad' : 'bKash'} · {L('পাঠিয়েছেন', 'from')} {p.gateway_payload?.sender}
                    {p.gateway_payload?.offer === 'winter' ? ` · ${L('শীতের অফার', 'winter offer')}` : p.gateway_payload?.code ? ` · ${L('কোড', 'code')} ${p.gateway_payload.code}` : ''} · {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="font-mono font-bold">{p.gateway_txn_id}</span>
                <span className="font-bold">৳{num(p.amount)}</span>
                <button className="btn-success !px-3 !py-1.5" onClick={() => check(p, true)}>{L('মিলেছে ✓', 'Matched ✓')}</button>
                <button className="btn-ghost !px-3 !py-1.5 text-red-600" onClick={() => check(p, false)}>{L('ভুয়া — বাতিল', 'Fake — revoke')}</button>
              </div>
            ))}
          </div>
        </section>
      )}
      {pendingManual.length > 0 && (
        <section className="card border-blush-200 p-4">
          <h2 className="mb-1 font-semibold text-ink">{L('অনুমোদনের অপেক্ষায় পেমেন্ট', 'Payments awaiting approval')} ({num(pendingManual.length)})</h2>
          <p className="mb-3 text-xs text-ink-soft">{L('আপনার bKash/Nagad অ্যাপের লেনদেন তালিকায় TrxID ও টাকার পরিমাণ মিলিয়ে তারপর অনুমোদন দিন।', 'Match the TrxID and amount in your bKash/Nagad app before approving.')}</p>
          <div className="space-y-2">
            {pendingManual.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-blush-50/50 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.profiles?.full_name || '—'} <span className="text-xs font-normal text-ink-soft">{p.profiles?.phone}</span></div>
                  <div className="text-xs text-ink-soft">
                    {p.gateway_payload?.method === 'nagad' ? 'Nagad' : 'bKash'} · {L('পাঠিয়েছেন', 'from')} {p.gateway_payload?.sender} · {p.plan}{p.mock_test_id ? ` #${p.mock_test_id}` : ''} · {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="font-mono font-bold">{p.gateway_txn_id}</span>
                <span className="font-bold">৳{num(p.amount)}</span>
                <button className="btn-success !px-3 !py-1.5" onClick={() => review(p, true)}>{L('অনুমোদন', 'Approve')}</button>
                <button className="btn-ghost !px-3 !py-1.5 text-red-600" onClick={() => review(p, false)}>{L('বাতিল', 'Reject')}</button>
              </div>
            ))}
          </div>
        </section>
      )}
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
                  <td className="px-3 py-2 text-right">
                    {p.status === 'paid' && <button className="text-xs text-red-600 hover:underline" onClick={() => refund(p)}>{L('রিফান্ড', 'Refund')}</button>}
                    {p.status === 'failed' && p.gateway === 'manual' && <button className="whitespace-nowrap text-xs font-semibold text-mint-700 hover:underline" onClick={() => review(p, true)}>{L('ভুলে বাতিল? অনুমোদন দিন', 'Rejected by mistake? Approve')}</button>}
                  </td>
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
