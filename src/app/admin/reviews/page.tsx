'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';

type R = { id: number; user_id: string; rating: number; body: string; display_name: string | null; status: string; created_at: string; updated_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null };
const TABS: [string, string][] = [['pending', 'অপেক্ষায়'], ['approved', 'দেখানো হচ্ছে'], ['rejected', 'বাতিল']];

export default function ReviewsAdmin() {
  const { num } = useApp();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<R[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    const { data, error } = await sb.from('reviews').select('*').eq('status', tab).order('updated_at', { ascending: false }).limit(200);
    if (error) { setErr(error.message); setRows([]); return; }
    const list = (data ?? []) as R[];
    const ids = list.map((r) => r.user_id);
    if (ids.length) {
      const { data: p } = await sb.from('profiles').select('id, full_name, phone').in('id', ids);
      const m = new Map((p ?? []).map((x: { id: string; full_name: string | null; phone: string | null }) => [x.id, x]));
      list.forEach((r) => { r.profiles = (m.get(r.user_id) as R['profiles']) ?? null; });
    }
    setRows(list);
  }, [sb, tab]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(r: R, status: string) {
    const { error } = await sb.from('reviews').update({ status }).eq('id', r.id);
    setErr(error ? error.message : ''); load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="রিভিউ" sub="প্রিমিয়াম সদস্যদের রিভিউ। অনুমোদন দিলে হোম ও প্রিমিয়াম পেজে দেখাবে।" />
      <div className="flex gap-2">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="card p-6 text-center text-ink-soft">কোনো রিভিউ নেই</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />)}</span>
                <b className="text-ink">{r.profiles?.full_name || '—'}</b>
                <span className="text-xs text-ink-soft">{r.profiles?.phone} · {new Date(r.updated_at).toLocaleString()}</span>
                {r.display_name && <span className="chip bg-brand-50 text-brand-700">দেখানো নাম: {r.display_name}</span>}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.body}</p>
              <div className="mt-3 flex gap-2">
                {r.status !== 'approved' && <button className="btn-success !py-1.5" onClick={() => setStatus(r, 'approved')}>অনুমোদন — দেখান</button>}
                {r.status !== 'rejected' && <button className="btn-ghost !py-1.5 text-red-600" onClick={() => setStatus(r, 'rejected')}>{r.status === 'approved' ? 'সরিয়ে নিন' : 'বাতিল'}</button>}
              </div>
            </div>
          ))}
          <p className="text-xs text-ink-soft">মোট {num(rows.length)}টি</p>
        </div>
      )}
    </div>
  );
}
