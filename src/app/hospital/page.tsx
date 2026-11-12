'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, ChevronDown, ChevronUp, FileText, Pencil, Phone, Plus, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { APP_STATUS_BN, DISTRICTS, JOB_TYPES, bdToday, type Job } from '@/lib/jobs';
import { bnDate, bnNum } from '@/lib/circulars';

type Hospital = { id: number; name: string; district: string | null; address: string | null; phone: string | null; email: string | null;
  website: string | null; contact_person: string | null; about: string | null; status: string; admin_note: string | null };
type Applicant = { id: number; job_id: number; status: string; note: string | null; cv_path: string | null; created_at: string;
  profile: Record<string, string | number | null> };

const H_STATUS: Record<string, { label: string; tone: string; text: string }> = {
  pending: { label: 'যাচাই চলছে', tone: 'bg-gold-100 text-gold-800', text: 'আপনার হাসপাতালের তথ্য যাচাই করা হচ্ছে। এর মধ্যেই বিজ্ঞপ্তি জমা দিতে পারেন — যাচাই শেষে প্রকাশ হবে।' },
  approved: { label: 'যাচাইকৃত ✓', tone: 'bg-mint-100 text-mint-700', text: 'আপনার হাসপাতাল যাচাইকৃত। নতুন বিজ্ঞপ্তি দ্রুত প্রকাশ করা হয়।' },
  rejected: { label: 'অনুমোদন হয়নি', tone: 'bg-red-100 text-red-700', text: 'তথ্য যাচাই করা যায়নি। প্রয়োজনে যোগাযোগ পাতা থেকে আমাদের জানান।' },
  suspended: { label: 'স্থগিত', tone: 'bg-red-100 text-red-700', text: 'অ্যাকাউন্টটি স্থগিত আছে। যোগাযোগ পাতা থেকে আমাদের জানান।' },
};
const J_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'যাচাই চলছে', tone: 'bg-gold-100 text-gold-800' }, published: { label: 'প্রকাশিত', tone: 'bg-mint-100 text-mint-700' },
  closed: { label: 'বন্ধ', tone: 'bg-slate-100 text-slate-600' }, rejected: { label: 'প্রকাশ হয়নি', tone: 'bg-red-100 text-red-700' },
};
const ERR: Record<string, string> = {
  name_required: 'হাসপাতালের নাম লিখুন।', phone_required: 'যোগাযোগের নম্বর লিখুন।', title_required: 'পদের নাম লিখুন।',
  bad_deadline: 'শেষ তারিখ আজকের আগে হতে পারে না।', rate_limited: 'অনেকবার চেষ্টা হয়েছে, পরে আবার চেষ্টা করুন।',
  hospital_blocked: 'অ্যাকাউন্টটি এখন বিজ্ঞপ্তি দিতে পারবে না।', suspended: 'অ্যাকাউন্টটি স্থগিত।',
  license_required: 'হাসপাতালের লাইসেন্স নম্বর দিন।', terms_required: 'নিয়মগুলোতে সম্মতি দিন।', bad_file: 'ফাইলটি আবার আপলোড করুন।',
};
const errText = (m: string) => { const k = Object.keys(ERR).find((x) => m.includes(x)); return k ? ERR[k] : 'সেভ হয়নি, আবার চেষ্টা করুন।'; };
const EMPTY_JOB = { id: '', post_title: 'স্টাফ নার্স', vacancies: '', district: '', location: '', salary: '', job_type: 'ফুল টাইম', qualifications: '', description: '', deadline: '', apply_info: '' };

/** Hospital portal: register the hospital, post vacancies (reviewed before going live), see and manage applicants. */
export default function HospitalPortal() {
  const { user, ready } = useApp();
  const router = useRouter();
  const sb = supabaseBrowser();
  const [h, setH] = useState<Hospital | null | undefined>(undefined);
  const [hf, setHf] = useState<Record<string, string>>({});
  const [editH, setEditH] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jf, setJf] = useState<typeof EMPTY_JOB | null>(null);
  const [apps, setApps] = useState<Record<number, Applicant[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [lic, setLic] = useState<{ has_license: boolean; has_doc: boolean; terms: boolean } | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const docInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await sb.from('hospitals').select('*').eq('owner_id', user.id).maybeSingle();
    setH((data as Hospital) ?? null);
    if (data) sb.rpc('my_hospital_license_status').then(({ data: l }) => setLic((l as typeof lic) ?? null));
    if (data) {
      const { data: j } = await sb.from('jobs').select('*').eq('hospital_id', (data as Hospital).id).order('created_at', { ascending: false });
      setJobs((j as Job[]) ?? []);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    load();
  }, [ready, user, load, router]);

  if (ready && !user) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 text-white shadow-card">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/85"><Building2 className="h-5 w-5" />হাসপাতাল ও ক্লিনিকের জন্য</p>
        <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">ফ্রিতে নার্স নিয়োগ বিজ্ঞপ্তি দিন</h1>
        <p className="mt-1 text-sm text-white/90">শুধু নার্সরাই দেখেন — আবেদন আসে সিভিসহ সরাসরি আপনার প্যানেলে। একবার অ্যাকাউন্ট খুলুন, এরপর শুধু লগইন করে বিজ্ঞপ্তি দিন।</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/signup?next=/hospital" className="btn bg-white text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" />হাসপাতালের অ্যাকাউন্ট খুলুন</Link>
          <Link href="/login?next=/hospital" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20">আগে অ্যাকাউন্ট খোলা? লগইন</Link>
        </div>
      </header>
      <section className="card p-5 text-sm text-ink">
        <h2 className="mb-2 font-semibold">কীভাবে কাজ করে</h2>
        <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
          <li>হাসপাতালের অ্যাকাউন্ট খুলুন (মোবাইল নম্বর বা ইমেইল দিয়ে)।</li>
          <li>হাসপাতালের তথ্য ও লাইসেন্স নম্বর দিন — আমরা যাচাই করি (লাইসেন্সের তথ্য প্রকাশ হয় না)।</li>
          <li>বিজ্ঞপ্তি দিন — যাচাইয়ের পর “✓ যাচাইকৃত হাসপাতাল” চিহ্নসহ প্রকাশ হয়।</li>
          <li>নার্সদের আবেদন, সিভি ও ফোন নম্বর দেখে বাছাই করুন।</li>
        </ol>
        <p className="mt-3 rounded-xl bg-mint-50 p-3 text-mint-800">এখন সম্পূর্ণ ফ্রি।</p>
      </section>
    </div>
  );
  if (h === undefined) return <Spinner />;
  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHf({ ...hf, [k]: e.target.value });

  async function uploadDoc(list: FileList | null) {
    const x = list?.[0]; if (!x || !user) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(x.type) || x.size > 5 * 1024 * 1024) { setMsg({ ok: false, t: 'PDF বা ছবি দিন, ৫ MB-এর কম।' }); return; }
    setUpBusy(true);
    const path = `${user.id}/license-${Date.now()}.${x.type === 'application/pdf' ? 'pdf' : x.type === 'image/png' ? 'png' : 'jpg'}`;
    const { error } = await sb.storage.from('hospital-docs').upload(path, x, { contentType: x.type, upsert: false });
    setUpBusy(false);
    if (error) { setMsg({ ok: false, t: 'ফাইল আপলোড হয়নি, আবার চেষ্টা করুন।' }); return; }
    setHf((cur) => ({ ...cur, license_doc: path }));
  }

  async function saveHospital(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await sb.rpc('register_hospital', { p: { ...hf, terms: hf.terms === 'yes' } });
    setBusy(false);
    if (error) { setMsg({ ok: false, t: errText(error.message) }); return; }
    setEditH(false); setMsg({ ok: true, t: 'হাসপাতালের তথ্য সেভ হয়েছে।' }); load();
  }
  async function saveJob(e: React.FormEvent) {
    e.preventDefault(); if (!jf) return; setBusy(true); setMsg(null);
    const { error } = await sb.rpc('hospital_save_job', { p: jf });
    setBusy(false);
    if (error) { setMsg({ ok: false, t: errText(error.message) }); return; }
    setJf(null); setMsg({ ok: true, t: 'বিজ্ঞপ্তি জমা হয়েছে। যাচাইয়ের পর প্রকাশ হবে (সাধারণত ২৪ ঘণ্টার মধ্যে)।' }); load();
  }
  async function closeJob(id: number) {
    if (!confirm('এই বিজ্ঞপ্তি বন্ধ করবেন? নতুন আবেদন আর আসবে না।')) return;
    await sb.rpc('hospital_close_job', { p_job: id }); load();
  }
  async function loadApps(jobId: number) {
    if (open === jobId) { setOpen(null); return; }
    setOpen(jobId);
    const { data } = await sb.from('job_applications').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
    setApps({ ...apps, [jobId]: (data as Applicant[]) ?? [] });
    // mark new ones as seen
    for (const a of ((data as Applicant[]) ?? []).filter((x) => x.status === 'submitted')) sb.rpc('hospital_set_application', { p_app: a.id, p_status: 'viewed' });
  }
  async function setStatus(a: Applicant, status: string) {
    const { error } = await sb.rpc('hospital_set_application', { p_app: a.id, p_status: status });
    if (!error) setApps({ ...apps, [a.job_id]: apps[a.job_id].map((x) => (x.id === a.id ? { ...x, status } : x)) });
  }
  async function openCv(path: string) {
    const { data } = await sb.storage.from('cvs').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  }

  const hospitalForm = (
    <form onSubmit={saveHospital} className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink"><Building2 className="h-5 w-5 text-brand-600" />হাসপাতালের তথ্য</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">হাসপাতাল / ক্লিনিকের নাম *</label><input className="input" required maxLength={150} value={hf.name ?? ''} onChange={setField('name')} /></div>
        <div><label className="label">জেলা</label><select className="input" value={hf.district ?? ''} onChange={setField('district')}><option value="">বেছে নিন</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div><label className="label">যোগাযোগের নম্বর *</label><input className="input" required inputMode="tel" maxLength={30} value={hf.phone ?? ''} onChange={setField('phone')} /></div>
        <div className="sm:col-span-2"><label className="label">ঠিকানা</label><input className="input" maxLength={300} value={hf.address ?? ''} onChange={setField('address')} /></div>
        <div><label className="label">এইচআর / যোগাযোগকারীর নাম</label><input className="input" maxLength={100} value={hf.contact_person ?? ''} onChange={setField('contact_person')} /></div>
        <div><label className="label">অফিসিয়াল ইমেইল</label><input className="input" type="email" maxLength={120} value={hf.email ?? ''} onChange={setField('email')} /></div>
        <div className="sm:col-span-2"><label className="label">ওয়েবসাইট / ফেসবুক পেজ</label><input className="input" type="url" maxLength={300} value={hf.website ?? ''} onChange={setField('website')} placeholder="https://" /></div>
        <div className="sm:col-span-2"><label className="label">হাসপাতাল সম্পর্কে</label><textarea className="input min-h-[70px]" maxLength={1000} value={hf.about ?? ''} onChange={setField('about')} placeholder="বেড সংখ্যা, বিভাগ ইত্যাদি" /></div>
      </div>
      <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <p className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="h-5 w-5 text-mint-600" />লাইসেন্স ও যাচাই</p>
        <p className="text-xs text-ink-soft">লাইসেন্সের তথ্য শুধু Nursing Career BD-এর অ্যাডমিন যাচাইয়ের জন্য দেখবেন — ওয়েবসাইটে কোথাও প্রকাশ হবে না।</p>
        {lic?.has_license && <p className="flex items-center gap-1.5 text-sm text-mint-700"><CheckCircle2 className="h-4 w-4" />লাইসেন্স নম্বর জমা আছে{lic.has_doc ? ' · কপিও জমা আছে' : ''}। বদলাতে চাইলে নতুন নম্বর লিখুন, না হলে খালি রাখুন।</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">স্বাস্থ্য অধিদপ্তরের (DGHS) লাইসেন্স নম্বর {lic?.has_license ? '' : '*'}</label>
            <input className="input" required={!lic?.has_license} maxLength={60} value={hf.license_no ?? ''} onChange={setField('license_no')} autoComplete="off" /></div>
          <div><label className="label">ট্রেড লাইসেন্স নম্বর</label><input className="input" maxLength={60} value={hf.trade_license ?? ''} onChange={setField('trade_license')} autoComplete="off" /></div>
        </div>
        <div>
          <input ref={docInput} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { uploadDoc(e.target.files); e.target.value = ''; }} />
          <button type="button" className="btn-ghost" disabled={upBusy} onClick={() => docInput.current?.click()}>
            <Upload className="h-4 w-4" />{upBusy ? 'আপলোড হচ্ছে…' : hf.license_doc ? 'লাইসেন্সের কপি যোগ হয়েছে ✓ (বদলাতে চাপুন)' : 'লাইসেন্সের কপি দিন (PDF/ছবি) — দ্রুত যাচাইয়ের জন্য'}
          </button>
        </div>
        {!lic?.terms && (
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" className="mt-1 h-4 w-4" required checked={hf.terms === 'yes'} onChange={(e) => setHf({ ...hf, terms: e.target.checked ? 'yes' : '' })} />
            <span>আমি নিশ্চিত করছি: দেওয়া তথ্য সত্য; আবেদনকারীর কাছ থেকে কোনো টাকা (জামানত, “নিয়োগ খরচ” ইত্যাদি) নেওয়া হবে না; আবেদনকারীর তথ্য শুধু নিয়োগের কাজে ব্যবহার হবে। ভুয়া তথ্য বা প্রতারণার প্রমাণ পেলে অ্যাকাউন্ট স্থায়ীভাবে বন্ধ হবে।</span>
          </label>
        )}
      </div>
      <p className="text-xs text-ink-soft">যাচাইয়ের জন্য আমরা দেওয়া নম্বর বা ইমেইলে যোগাযোগ করতে পারি।</p>
      <div className="flex gap-2">
        <button className="btn-success" disabled={busy}>{busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
        {h && <button type="button" className="btn-ghost" onClick={() => setEditH(false)}>বাতিল</button>}
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="হাসপাতালের জন্য" sub="ফ্রিতে নার্স নিয়োগ বিজ্ঞপ্তি দিন — শুধু নার্সরাই দেখবেন, আবেদন আসবে সরাসরি এখানে।" />
      {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}

      {!h || editH ? (
        <>
          {!h && (
            <section className="rounded-2xl bg-brand-50 p-4 text-sm text-ink">
              <b>কীভাবে কাজ করে:</b> ১) হাসপাতালের তথ্য দিন ২) বিজ্ঞপ্তি জমা দিন ৩) আমরা যাচাই করে প্রকাশ করি ৪) নার্সরা সিভিসহ আবেদন করেন, আপনি এখানে দেখেন ও বাছাই করেন। <b>এখন সম্পূর্ণ ফ্রি।</b>
            </section>
          )}
          {hospitalForm}
        </>
      ) : (
        <section className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-lg text-ink">{h.name}</b>
            <span className={`chip ${H_STATUS[h.status]?.tone}`}>{H_STATUS[h.status]?.label}</span>
            <button className="ml-auto btn-ghost !py-1 text-sm" onClick={() => { setHf(Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v == null ? '' : String(v)]))); setEditH(true); }}><Pencil className="h-4 w-4" />তথ্য বদলান</button>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{H_STATUS[h.status]?.text}</p>
          {h.admin_note && <p className="mt-1 text-sm text-ink">অ্যাডমিনের নোট: {h.admin_note}</p>}
        </section>
      )}

      {h && !editH && !['rejected', 'suspended'].includes(h.status) && (
        <>
          {jf ? (
            <form onSubmit={saveJob} className="card space-y-3 p-5">
              <h2 className="font-semibold text-ink">{jf.id ? 'বিজ্ঞপ্তি সম্পাদনা' : 'নতুন নিয়োগ বিজ্ঞপ্তি'}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">পদের নাম *</label><input className="input" required maxLength={150} value={jf.post_title} onChange={(e) => setJf({ ...jf, post_title: e.target.value })} /></div>
                <div><label className="label">পদ সংখ্যা</label><input className="input" inputMode="numeric" maxLength={4} value={jf.vacancies} onChange={(e) => setJf({ ...jf, vacancies: e.target.value.replace(/\D/g, '') })} /></div>
                <div><label className="label">চাকরির ধরন</label><select className="input" value={jf.job_type} onChange={(e) => setJf({ ...jf, job_type: e.target.value })}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="label">আবেদনের শেষ তারিখ</label><input className="input" type="date" min={bdToday()} value={jf.deadline} onChange={(e) => setJf({ ...jf, deadline: e.target.value })} /></div>
                <div><label className="label">জেলা</label><select className="input" value={jf.district} onChange={(e) => setJf({ ...jf, district: e.target.value })}><option value="">হাসপাতালের জেলা</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></div>
                <div><label className="label">কর্মস্থল / এলাকা</label><input className="input" maxLength={200} value={jf.location} onChange={(e) => setJf({ ...jf, location: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="label">বেতন ও সুবিধা</label><input className="input" maxLength={100} value={jf.salary} onChange={(e) => setJf({ ...jf, salary: e.target.value })} placeholder="যেমন: ২০,০০০–২৫,০০০ টাকা, আলোচনা সাপেক্ষে" /></div>
              </div>
              <div><label className="label">যোগ্যতা ও অভিজ্ঞতা</label><textarea className="input min-h-[80px]" maxLength={3000} value={jf.qualifications} onChange={(e) => setJf({ ...jf, qualifications: e.target.value })} placeholder="যেমন: ডিপ্লোমা ইন নার্সিং, BNMC রেজিস্ট্রেশন, ICU অভিজ্ঞতা অগ্রাধিকার" /></div>
              <div><label className="label">কাজের বিবরণ</label><textarea className="input min-h-[80px]" maxLength={5000} value={jf.description} onChange={(e) => setJf({ ...jf, description: e.target.value })} /></div>
              <div><label className="label">অতিরিক্ত নির্দেশনা (ঐচ্ছিক)</label><input className="input" maxLength={500} value={jf.apply_info} onChange={(e) => setJf({ ...jf, apply_info: e.target.value })} placeholder="যেমন: ভাইভার জন্য ফোনে জানানো হবে" /></div>
              <p className="text-xs text-ink-soft">নার্সরা এই সাইট থেকেই সিভিসহ আবেদন করবেন; আবেদনগুলো নিচে আপনার বিজ্ঞপ্তির তালিকায় দেখবেন। আবেদনকারীর কাছ থেকে কোনো টাকা চাওয়া নিষেধ।</p>
              <div className="flex gap-2">
                <button className="btn-success" disabled={busy}>{busy ? 'জমা হচ্ছে…' : 'যাচাইয়ের জন্য জমা দিন'}</button>
                <button type="button" className="btn-ghost" onClick={() => setJf(null)}>বাতিল</button>
              </div>
            </form>
          ) : (
            <button className="btn-primary" onClick={() => setJf({ ...EMPTY_JOB })}><Plus className="h-4 w-4" />নতুন নিয়োগ বিজ্ঞপ্তি দিন</button>
          )}

          <section className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-ink">{j.post_title}</b>
                  <span className={`chip ${J_STATUS[j.status]?.tone}`}>{J_STATUS[j.status]?.label}</span>
                  <span className="text-xs text-ink-soft">{j.deadline ? `শেষ তারিখ ${bnDate(j.deadline)}` : ''}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-ghost !py-1 text-sm" onClick={() => loadApps(j.id)}>
                    {open === j.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}আবেদনকারী দেখুন
                  </button>
                  {j.status === 'published' && <Link href={`/jobs/${j.slug}`} className="btn-ghost !py-1 text-sm">বিজ্ঞপ্তি দেখুন</Link>}
                  {j.status !== 'closed' && <button className="btn-ghost !py-1 text-sm" onClick={() => setJf({ ...EMPTY_JOB, ...Object.fromEntries(Object.entries(j).filter(([k]) => k in EMPTY_JOB).map(([k, v]) => [k, v == null ? '' : String(v)])), id: String(j.id) })}><Pencil className="h-4 w-4" />সম্পাদনা</button>}
                  {j.status !== 'closed' && <button className="btn-ghost !py-1 text-sm text-red-600" onClick={() => closeJob(j.id)}><XCircle className="h-4 w-4" />বন্ধ করুন</button>}
                </div>
                {open === j.id && (
                  h.status !== 'approved' ? <p className="mt-3 text-sm text-ink-soft">হাসপাতাল যাচাই হওয়ার পর আবেদনকারীদের তথ্য দেখা যাবে।</p>
                  : !apps[j.id] ? <Spinner /> : apps[j.id].length === 0 ? <p className="mt-3 text-sm text-ink-soft">এখনো কোনো আবেদন আসেনি।</p> : (
                    <ul className="mt-3 divide-y divide-brand-100">
                      {apps[j.id].map((a) => {
                        const p = a.profile;
                        return (
                          <li key={a.id} className="space-y-1 py-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="text-ink">{String(p.full_name ?? '')}</b>
                              <span className={`chip ${APP_STATUS_BN[a.status]?.tone}`}>{APP_STATUS_BN[a.status]?.label}</span>
                              <span className="text-xs text-ink-soft">{bnDate(a.created_at)}</span>
                            </div>
                            <p className="text-ink-soft">{[p.qualification, p.institute, p.passing_year && `পাস ${bnNum(String(p.passing_year))}`].filter(Boolean).join(' · ')}</p>
                            <p className="text-ink-soft">{[p.experience_years != null && `অভিজ্ঞতা ${bnNum(String(p.experience_years))} বছর`, p.current_workplace, p.district, p.bnmc_reg && `BNMC: ${p.bnmc_reg}`].filter(Boolean).join(' · ')}</p>
                            {p.experience && <p className="whitespace-pre-line text-ink-soft">{String(p.experience)}</p>}
                            {a.note && <p className="rounded-lg bg-brand-50 p-2 text-ink">“{a.note}”</p>}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <a href={`tel:${String(p.phone ?? '').replace(/[^\d+]/g, '')}`} className="btn-ghost !py-1 text-sm"><Phone className="h-4 w-4" />{String(p.phone ?? '')}</a>
                              {a.cv_path && <button className="btn-ghost !py-1 text-sm" onClick={() => openCv(a.cv_path!)}><FileText className="h-4 w-4" />সিভি ফাইল</button>}
                              <button className="btn-ghost !py-1 text-sm text-mint-700" onClick={() => setStatus(a, 'shortlisted')}>বাছাই তালিকায়</button>
                              <button className="btn-ghost !py-1 text-sm" onClick={() => setStatus(a, 'hired')}>নিয়োগ দেওয়া হয়েছে</button>
                              <button className="btn-ghost !py-1 text-sm text-red-600" onClick={() => setStatus(a, 'rejected')}>নির্বাচিত নয়</button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
