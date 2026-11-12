'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Pencil, Plus, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Spinner } from '@/components/ui';
import { DISTRICTS, JOB_TYPES, safeUrl, type Job } from '@/lib/jobs';
import { bnDate, bnNum } from '@/lib/circulars';

type Hospital = { id: number; name: string; district: string | null; address: string | null; phone: string | null; email: string | null;
  website: string | null; contact_person: string | null; about: string | null; status: string; created_at: string };
type Tab = 'review' | 'jobs' | 'hospitals' | 'add';
const EMPTY = { hospital_name: '', post_title: 'স্টাফ নার্স', vacancies: '', district: '', location: '', salary: '', job_type: 'ফুল টাইম',
  qualifications: '', description: '', deadline: '', apply_url: '', apply_info: '', source_url: '' };

export default function AdminJobs() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [tab, setTab] = useState<Tab>('review');
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [f, setF] = useState<typeof EMPTY & { id?: number }>({ ...EMPTY });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: j }, { data: h }, { data: a }] = await Promise.all([
      sb.from('jobs').select('*').order('created_at', { ascending: false }).limit(300),
      sb.from('hospitals').select('*').order('created_at', { ascending: false }).limit(300),
      sb.from('job_applications').select('job_id').limit(5000),
    ]);
    setJobs((j as Job[]) ?? []); setHospitals((h as Hospital[]) ?? []);
    const c: Record<number, number> = {}; for (const r of (a as { job_id: number }[]) ?? []) c[r.job_id] = (c[r.job_id] ?? 0) + 1;
    setCounts(c);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function setJob(j: Job, status: Job['status']) {
    const note = status === 'rejected' ? prompt('কেন প্রকাশ হলো না? (হাসপাতাল দেখবে)') ?? '' : null;
    const { error } = await sb.from('jobs').update({ status, ...(note !== null ? { admin_note: note } : {}) }).eq('id', j.id);
    setMsg(error ? error.message : 'হালনাগাদ হয়েছে'); load();
  }
  async function setHospital(h: Hospital, status: string) {
    const { error } = await sb.from('hospitals').update({ status, updated_at: new Date().toISOString() }).eq('id', h.id);
    setMsg(error ? error.message : 'হালনাগাদ হয়েছে'); load();
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.apply_url && !f.apply_info) { setMsg('আবেদনের লিংক বা আবেদনের নিয়ম — অন্তত একটি দিন।'); return; }
    if (f.apply_url && !safeUrl(f.apply_url)) { setMsg('আবেদনের লিংক https:// দিয়ে শুরু হতে হবে।'); return; }
    const row = {
      hospital_name: f.hospital_name.trim(), post_title: f.post_title.trim(), vacancies: f.vacancies ? Number(f.vacancies) : null,
      district: f.district || null, location: f.location || null, salary: f.salary || null, job_type: f.job_type || null,
      qualifications: f.qualifications || null, description: f.description || null, deadline: f.deadline || null,
      apply_mode: 'external' as const, apply_url: f.apply_url || null, apply_info: f.apply_info || null, source_url: f.source_url || null,
    };
    const { error } = f.id
      ? await sb.from('jobs').update(row).eq('id', f.id)
      : await sb.from('jobs').insert({ ...row, status: 'published' });
    setMsg(error ? error.message : f.id ? 'বিজ্ঞপ্তি হালনাগাদ হয়েছে' : 'বিজ্ঞপ্তি প্রকাশ হয়েছে');
    if (!error) { setF({ ...EMPTY }); setTab('jobs'); load(); }
  }

  const pendingJobs = (jobs ?? []).filter((j) => j.status === 'pending');
  const pendingH = hospitals.filter((h) => h.status === 'pending');
  const hName = (id: number | null) => hospitals.find((h) => h.id === id);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <PageHeader title="প্রাইভেট চাকরি" sub="হাসপাতাল ও তাদের বিজ্ঞপ্তি যাচাই করুন, অন্য জায়গার বিজ্ঞপ্তি যোগ করুন।" />
      <div className="flex flex-wrap gap-2">
        {([['review', `যাচাই বাকি (${bnNum(pendingJobs.length + pendingH.length)})`], ['jobs', 'সব বিজ্ঞপ্তি'], ['hospitals', 'হাসপাতাল'], ['add', 'নতুন বিজ্ঞপ্তি যোগ']] as [Tab, string][])
          .map(([k, l]) => <button key={k} className={tab === k ? 'btn-primary' : 'btn-ghost'} onClick={() => { setTab(k); if (k === 'add' && !f.id) setF({ ...EMPTY }); }}>{l}</button>)}
      </div>
      {msg && <p className="rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
      {!jobs ? <Spinner /> : tab === 'review' ? (
        <div className="space-y-3">
          {pendingH.length === 0 && pendingJobs.length === 0 && <p className="card p-6 text-center text-ink-soft">যাচাই বাকি কিছু নেই</p>}
          {pendingH.map((h) => (
            <div key={`h${h.id}`} className="card space-y-1 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="chip bg-gold-100 text-gold-800">নতুন হাসপাতাল</span><b className="text-ink">{h.name}</b></div>
              <p className="text-ink-soft">{[h.district, h.address].filter(Boolean).join(', ')} · ফোন {h.phone} {h.email ? `· ${h.email}` : ''} {h.contact_person ? `· ${h.contact_person}` : ''}</p>
              {safeUrl(h.website) && <a href={safeUrl(h.website)!} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline">{h.website}</a>}
              {h.about && <p className="text-ink-soft">{h.about}</p>}
              <p className="text-xs text-ink-soft">যাচাই: ফোন করে বা ওয়েবসাইট/ফেসবুক পেজ দেখে নিশ্চিত হোন যে এটি আসল হাসপাতাল।</p>
              <div className="flex gap-2 pt-1">
                <button className="btn-success !py-1.5" onClick={() => setHospital(h, 'approved')}><Check className="h-4 w-4" />অনুমোদন</button>
                <button className="btn-ghost !py-1.5 text-red-600" onClick={() => setHospital(h, 'rejected')}><X className="h-4 w-4" />বাতিল</button>
              </div>
            </div>
          ))}
          {pendingJobs.map((j) => {
            const h = hName(j.hospital_id);
            return (
              <div key={`j${j.id}`} className="card space-y-1 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="chip bg-brand-100 text-brand-700">বিজ্ঞপ্তি</span><b className="text-ink">{j.post_title} — {j.hospital_name}</b>
                  {h && <span className={`chip ${h.status === 'approved' ? 'bg-mint-100 text-mint-700' : 'bg-gold-100 text-gold-800'}`}>হাসপাতাল: {h.status === 'approved' ? 'যাচাইকৃত' : h.status}</span>}</div>
                <p className="text-ink-soft">{[j.district, j.location, j.vacancies && `${bnNum(j.vacancies)} জন`, j.salary, j.deadline && `শেষ ${bnDate(j.deadline)}`].filter(Boolean).join(' · ')}</p>
                {j.qualifications && <p className="whitespace-pre-line text-ink-soft">যোগ্যতা: {j.qualifications}</p>}
                {j.description && <p className="whitespace-pre-line text-ink-soft">{j.description}</p>}
                <div className="flex gap-2 pt-1">
                  <button className="btn-success !py-1.5" disabled={!!h && h.status !== 'approved'} title={h && h.status !== 'approved' ? 'আগে হাসপাতাল অনুমোদন করুন' : ''} onClick={() => setJob(j, 'published')}><Check className="h-4 w-4" />প্রকাশ করুন</button>
                  <button className="btn-ghost !py-1.5 text-red-600" onClick={() => setJob(j, 'rejected')}><X className="h-4 w-4" />প্রকাশ নয়</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'jobs' ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs text-ink-soft"><tr><th className="px-3 py-2">বিজ্ঞপ্তি</th><th className="px-3 py-2">অবস্থা</th><th className="px-3 py-2">আবেদন</th><th className="px-3 py-2">শেষ তারিখ</th><th className="px-3 py-2" /></tr></thead>
            <tbody className="divide-y divide-brand-100">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-3 py-2"><div className="font-medium text-ink">{j.post_title}</div><div className="text-xs text-ink-soft">{j.hospital_name} · {j.apply_mode === 'site' ? 'সাইটে আবেদন' : 'বাইরের লিংক'}</div></td>
                  <td className="px-3 py-2">{j.status}</td>
                  <td className="px-3 py-2">{bnNum(counts[j.id] ?? 0)}</td>
                  <td className="px-3 py-2 text-xs">{j.deadline ? bnDate(j.deadline) : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {j.status === 'published' && <Link href={`/jobs/${j.slug}`} target="_blank" className="rounded-lg p-1.5 text-ink-soft hover:bg-brand-50"><ExternalLink className="inline h-4 w-4" /></Link>}
                    {j.apply_mode === 'external' && <button className="rounded-lg p-1.5 text-ink-soft hover:bg-brand-50" onClick={() => { setF({ ...EMPTY, ...Object.fromEntries(Object.entries(j).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v == null ? '' : String(v)])), id: j.id }); setTab('add'); }}><Pencil className="inline h-4 w-4" /></button>}
                    {j.status === 'published' ? <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setJob(j, 'closed')}>বন্ধ</button>
                      : j.status === 'closed' ? <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setJob(j, 'published')}>আবার খুলুন</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'hospitals' ? (
        <div className="space-y-2">
          {hospitals.length === 0 && <p className="card p-6 text-center text-ink-soft">এখনো কোনো হাসপাতাল নিবন্ধন করেনি</p>}
          {hospitals.map((h) => (
            <div key={h.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <b className="text-ink">{h.name}</b><span className="text-ink-soft">{h.district} · {h.phone}</span><span className="chip bg-brand-50 text-brand-700">{h.status}</span>
              <span className="ml-auto flex gap-1">
                {h.status !== 'approved' && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setHospital(h, 'approved')}>অনুমোদন</button>}
                {h.status !== 'suspended' && <button className="btn-ghost !px-2 !py-1 text-xs text-red-600" onClick={() => setHospital(h, 'suspended')}>স্থগিত</button>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={save} className="card space-y-3 p-5">
          <h2 className="font-semibold text-ink">{f.id ? 'বিজ্ঞপ্তি সম্পাদনা' : 'অন্য জায়গার বিজ্ঞপ্তি যোগ করুন'} <span className="text-xs font-normal text-ink-soft">(আবেদন হবে হাসপাতালের নিজের লিংক/ঠিকানায়)</span></h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">হাসপাতালের নাম *</label><input className="input" required maxLength={150} value={f.hospital_name} onChange={set('hospital_name')} /></div>
            <div><label className="label">পদের নাম *</label><input className="input" required maxLength={150} value={f.post_title} onChange={set('post_title')} /></div>
            <div><label className="label">পদ সংখ্যা</label><input className="input" inputMode="numeric" value={f.vacancies} onChange={(e) => setF({ ...f, vacancies: e.target.value.replace(/\D/g, '') })} /></div>
            <div><label className="label">শেষ তারিখ</label><input className="input" type="date" value={f.deadline} onChange={set('deadline')} /></div>
            <div><label className="label">জেলা</label><select className="input" value={f.district} onChange={set('district')}><option value="">—</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div><label className="label">এলাকা</label><input className="input" maxLength={200} value={f.location} onChange={set('location')} /></div>
            <div><label className="label">চাকরির ধরন</label><select className="input" value={f.job_type} onChange={set('job_type')}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">বেতন</label><input className="input" maxLength={100} value={f.salary} onChange={set('salary')} /></div>
          </div>
          <div><label className="label">যোগ্যতা</label><textarea className="input min-h-[70px]" maxLength={3000} value={f.qualifications} onChange={set('qualifications')} /></div>
          <div><label className="label">বিবরণ</label><textarea className="input min-h-[70px]" maxLength={5000} value={f.description} onChange={set('description')} /></div>
          <div><label className="label">আবেদনের লিংক (https://)</label><input className="input" type="url" maxLength={500} value={f.apply_url} onChange={set('apply_url')} /></div>
          <div><label className="label">আবেদনের নিয়ম / ঠিকানা / ইমেইল</label><textarea className="input min-h-[60px]" maxLength={500} value={f.apply_info} onChange={set('apply_info')} /></div>
          <div><label className="label">সূত্র (মূল বিজ্ঞপ্তির লিংক)</label><input className="input" type="url" maxLength={500} value={f.source_url} onChange={set('source_url')} /></div>
          <div className="flex gap-2"><button className="btn-success"><Plus className="h-4 w-4" />{f.id ? 'সেভ করুন' : 'প্রকাশ করুন'}</button>
            {f.id && <button type="button" className="btn-ghost" onClick={() => setF({ ...EMPTY })}>নতুন</button>}</div>
        </form>
      )}
    </div>
  );
}
