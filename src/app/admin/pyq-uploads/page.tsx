'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Trash2, FileText } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';

type S = { id: number; user_id: string; exam_type: string; exam_name: string; year: number | null; note: string | null; files: string[];
  status: string; files_deleted: boolean; created_at: string; profiles?: { full_name: string | null; phone: string | null } | null; urls?: string[]; dls?: string[] };
const TABS: [string, string][] = [['pending', 'নতুন / যাচাই বাকি'], ['added', 'যোগ করা হয়েছে'], ['rejected', 'বাতিল']];

export default function PyqUploadsAdmin() {
  const { num } = useApp();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<S[] | null>(null);
  const [err, setErr] = useState('');
  const [big, setBig] = useState<string | null>(null);

  // Files of finished submissions (added / rejected) are removed from storage automatically
  const cleanup = useCallback(async () => {
    const { data } = await sb.from('pyq_submissions').select('id, files').neq('status', 'pending').eq('files_deleted', false).limit(50);
    for (const s of (data ?? []) as { id: number; files: string[] }[]) {
      const { error } = await sb.storage.from('pyq-uploads').remove(s.files);
      if (!error) await sb.from('pyq_submissions').update({ files_deleted: true }).eq('id', s.id);
    }
  }, [sb]);

  const load = useCallback(async () => {
    setRows(null);
    await cleanup();
    const { data, error } = await sb.from('pyq_submissions').select('*').eq('status', tab).order('created_at', { ascending: false }).limit(100);
    if (error) { setErr(error.message); setRows([]); return; }
    const list = (data ?? []) as S[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: p } = await sb.from('profiles').select('id, full_name, phone').in('id', ids);
      const m = new Map((p ?? []).map((x: { id: string; full_name: string | null; phone: string | null }) => [x.id, x]));
      list.forEach((r) => { r.profiles = (m.get(r.user_id) as S['profiles']) ?? null; });
    }
    await Promise.all(list.filter((r) => !r.files_deleted).map(async (r) => {
      const { data: u } = await sb.storage.from('pyq-uploads').createSignedUrls(r.files, 3600);
      r.urls = (u ?? []).map((x) => x.signedUrl ?? '');
      // separate links that make the phone save the file (Content-Disposition: attachment) with a clear name
      const base = `${r.exam_name.replace(/[\s/\\:*?"<>|]+/g, '-')}${r.year ? `-${r.year}` : ''}`;
      r.dls = await Promise.all(r.files.map(async (f, i) => {
        const { data: d } = await sb.storage.from('pyq-uploads').createSignedUrl(f, 3600, { download: `${base}-${i + 1}.${f.split('.').pop()}` });
        return d?.signedUrl ?? '';
      }));
    }));
    setRows(list);
  }, [sb, tab, cleanup]);
  useEffect(() => { load(); }, [load]);

  async function finish(r: S, status: 'added' | 'rejected') {
    const q = status === 'added'
      ? 'এই প্রশ্নপত্র ওয়েবসাইটে যোগ হয়ে গেছে? নিশ্চিত করলে ছবিগুলো স্থায়ীভাবে মুছে যাবে।'
      : 'বাতিল করবেন? ছবিগুলো স্থায়ীভাবে মুছে যাবে।';
    if (!confirm(q)) return;
    const { error } = await sb.from('pyq_submissions').update({ status, updated_at: new Date().toISOString() }).eq('id', r.id);
    setErr(error ? error.message : ''); load();
  }



  return (
    <div className="space-y-4">
      <PageHeader title="ব্যবহারকারীদের পাঠানো প্রশ্নপত্র"
        sub="ছবি দেখে ঠিক থাকলে ডাউনলোড করে Claude-কে দিন। প্রশ্ন ওয়েবসাইটে যোগ হলে “যোগ হয়েছে” চাপুন — ছবি নিজে থেকেই মুছে যাবে।" />
      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="card p-6 text-center text-ink-soft">কিছু নেই</p> : rows.map((r) => (
        <div key={r.id} className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-brand-50 text-brand-700">{r.exam_type === 'mcq' ? 'MCQ' : 'লিখিত'}</span>
            <b className="text-ink">{r.exam_name}{r.year ? ` (${num(r.year)})` : ''}</b>
            <span className="text-xs text-ink-soft">#{r.id} · {r.profiles?.full_name || '—'} {r.profiles?.phone ?? ''} · {new Date(r.created_at).toLocaleString()}</span>
          </div>
          {r.note && <p className="whitespace-pre-line rounded-xl bg-brand-50/50 p-2 text-sm text-ink">{r.note}</p>}
          {r.files_deleted ? <p className="text-xs text-ink-soft">ছবিগুলো মুছে ফেলা হয়েছে ({num(r.files.length)}টি)।</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {(r.urls ?? []).map((u, i) => (
                <div key={i} className="space-y-1.5">
                  {r.files[i].endsWith('.pdf')
                    ? <a href={u} target="_blank" rel="noopener" className="grid aspect-[3/4] place-items-center rounded-xl border border-brand-100 text-xs text-ink-soft"><FileText className="h-6 w-6" />PDF</a>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <button onClick={() => setBig(u)} className="block aspect-[3/4] w-full overflow-hidden rounded-xl border border-brand-100"><img src={u} alt="" className="h-full w-full object-cover" /></button>}
                  <a href={r.dls?.[i] || u} download className="btn-primary w-full !py-1.5 text-sm"><Download className="h-4 w-4" />ডাউনলোড {num(i + 1)}</a>
                </div>
              ))}
            </div>
          )}
          {r.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-success !py-1.5" onClick={() => finish(r, 'added')}>ওয়েবসাইটে যোগ হয়েছে — ছবি মুছুন</button>
              <button className="btn-ghost !py-1.5 text-red-600" onClick={() => finish(r, 'rejected')}><Trash2 className="h-4 w-4" />বাতিল — ছবি মুছুন</button>
            </div>
          )}
        </div>
      ))}
      {big && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3" onClick={() => setBig(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
