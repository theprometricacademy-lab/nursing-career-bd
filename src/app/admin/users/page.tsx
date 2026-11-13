'use client';
import { useCallback, useEffect, useState } from 'react';
import { Crown, Search, ShieldCheck, ShieldOff, Ban } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type U = { id: string; full_name: string | null; phone: string | null; role: string; created_at: string; email: string; last_sign_in_at: string | null; premium: boolean; tests: number;
  practiced: number; practice_correct: number; last_practice: string | null; hospital: string | null };

export default function UsersAdmin() {
  const L = useL();
  const { num, user: me } = useApp();
  // 'আজ' / 'গতকাল' / 'n দিন আগে' for the last practice time
  const lastSeen = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? L('আজ', 'today') : d === 1 ? L('গতকাল', 'yesterday') : L(`${num(d)} দিন আগে`, `${d}d ago`);
  };
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<U[] | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await sb.rpc('admin_list_users', { p_search: q.trim() || null, p_limit: 50, p_offset: page * 50 });
    if (error) setMsg(error.message); else setRows(data as U[]);
  }, [sb, q, page]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  async function grant(u: U) {
    if (!confirm(L(`${u.email} কে আজীবন প্রিমিয়াম দেবেন?`, `Give lifetime Premium to ${u.email}?`))) return;
    const { error } = await sb.rpc('admin_grant_premium', { p_user: u.id, p_plan: 'lifetime', p_test: null });
    setMsg(error ? error.message : L('প্রিমিয়াম চালু হয়েছে', 'Premium granted')); load();
  }
  async function revoke(u: U) {
    if (!confirm(L(`${u.email} এর প্রিমিয়াম বাতিল করবেন?`, `Revoke Premium from ${u.email}?`))) return;
    const { error } = await sb.from('subscriptions').update({ status: 'revoked' }).eq('user_id', u.id).eq('plan', 'lifetime').eq('status', 'active');
    setMsg(error ? error.message : L('প্রিমিয়াম বাতিল হয়েছে', 'Premium revoked')); load();
  }
  async function setRole(u: U, role: 'admin' | 'student') {
    if (!confirm(L(`${u.email} কে ${role} করবেন?`, `Make ${u.email} ${role}?`))) return;
    const { error } = await sb.rpc('admin_set_role', { p_user: u.id, p_role: role });
    setMsg(error ? error.message : 'OK'); load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={L('ইউজার ও প্রিমিয়াম সাবস্ক্রিপশন', 'Users & premium subscriptions')} />
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
        <input className="input pl-9" placeholder={L('ইমেইল, নাম বা ফোন', 'Email, name or phone')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
      {msg && <p className="rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
      {!rows ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs text-ink-soft">
              <tr><th className="px-3 py-2">{L('ইউজার', 'User')}</th><th className="px-3 py-2">{L('ফোন', 'Phone')}</th><th className="px-3 py-2">{L('প্র্যাকটিস', 'Practised')}</th><th className="px-3 py-2">{L('টেস্ট', 'Tests')}</th><th className="px-3 py-2">{L('যোগদান', 'Joined')}</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 font-medium text-ink">{u.full_name || '—'}
                      {u.premium && <Crown className="h-4 w-4 text-blush-600" />}
                      {u.role === 'admin' && <span className="chip bg-ink text-white">admin</span>}
                      {u.hospital && <span className="chip bg-mint-100 text-mint-700" title={u.hospital}>🏥 হাসপাতাল</span>}
                    </div>
                    <div className="text-xs text-ink-soft">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">{u.phone || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {u.practiced > 0 ? (<>
                      <div className="font-semibold text-ink">{num(u.practiced)}{L('টি প্রশ্ন', ' Qs')}</div>
                      <div className="text-xs">
                        <span className="font-semibold text-mint-700">✓ {num(u.practice_correct)} {L('ঠিক', 'right')}</span>
                        <span className="text-ink-soft"> · </span>
                        <span className="font-semibold text-red-600">✗ {num(u.practiced - u.practice_correct)} {L('ভুল', 'wrong')}</span>
                        <span className="text-ink-soft"> · {num(Math.round((u.practice_correct / u.practiced) * 100))}%</span>
                      </div>
                      {u.last_practice && <div className="text-xs text-ink-soft">{lastSeen(u.last_practice)}</div>}
                    </>) : <span className="text-ink-soft">০</span>}
                  </td>
                  <td className="px-3 py-2">{num(u.tests)}</td>
                  <td className="px-3 py-2 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {u.premium
                      ? <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => revoke(u)}><Ban className="h-3.5 w-3.5" />{L('প্রিমিয়াম বাতিল', 'Revoke')}</button>
                      : <button className="btn-pink !px-2 !py-1 text-xs" onClick={() => grant(u)}><Crown className="h-3.5 w-3.5" />{L('প্রিমিয়াম দিন', 'Grant')}</button>}
                    {u.id !== me?.id && (u.role === 'admin'
                      ? <button className="ml-1 rounded-lg p-1.5 text-ink-soft hover:bg-brand-50" title="remove admin" onClick={() => setRole(u, 'student')}><ShieldOff className="h-4 w-4" /></button>
                      : <button className="ml-1 rounded-lg p-1.5 text-ink-soft hover:bg-brand-50" title="make admin" onClick={() => setRole(u, 'admin')}><ShieldCheck className="h-4 w-4" /></button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
        <span className="text-sm">{num(page + 1)}</span>
        <button className="btn-ghost" disabled={(rows?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>›</button>
      </div>
    </div>
  );
}
