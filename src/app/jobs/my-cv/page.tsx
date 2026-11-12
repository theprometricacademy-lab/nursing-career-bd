'use client';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, FileText, FileUser, Upload } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { APP_STATUS_BN, DISTRICTS, QUALIFICATIONS, type CandidateProfile } from '@/lib/jobs';
import { bnDate } from '@/lib/circulars';

type App = { id: number; status: string; created_at: string; jobs: { post_title: string; hospital_name: string; slug: string } | null };
const EMPTY: CandidateProfile = {
  full_name: '', phone: '', email: '', district: '', address: '', date_of_birth: '', gender: '', qualification: '', institute: '',
  passing_year: null, bnmc_reg: '', experience_years: null, experience: '', current_workplace: '', skills: '', about: '', cv_path: null,
};
const ERR: Record<string, string> = {
  name_required: 'নাম লিখুন।', phone_required: 'মোবাইল নম্বর লিখুন।', qualification_required: 'শিক্ষাগত যোগ্যতা বেছে নিন।',
  rate_limited: 'অনেকবার সেভ করেছেন, একটু পরে চেষ্টা করুন।', bad_file: 'ফাইলটি ঠিক নেই, আবার আপলোড করুন।',
};

export default function MyCvPage() {
  return <Suspense><MyCv /></Suspense>;
}

function MyCv() {
  const { user, ready, profile } = useApp();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const sb = supabaseBrowser();
  const [f, setF] = useState<CandidateProfile | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace('/login?next=/jobs/my-cv'); return; }
    sb.from('candidate_profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setF(data ? { ...EMPTY, ...(data as CandidateProfile) }
        : { ...EMPTY, full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', email: user.email && !user.email.endsWith('nursingjob.online') ? user.email : '' });
    });
    sb.from('job_applications').select('id, status, created_at, jobs(post_title, hospital_name, slug)').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(50).then(({ data }) => setApps((data as unknown as App[]) ?? []));
  }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return <Spinner />;
  const set = (k: keyof CandidateProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function upload(list: FileList | null) {
    const x = list?.[0]; if (!x || !user || !f) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(x.type)) { setMsg({ ok: false, t: 'শুধু PDF বা ছবি (JPG/PNG) দিন।' }); return; }
    if (x.size > 5 * 1024 * 1024) { setMsg({ ok: false, t: 'ফাইল ৫ MB-এর কম হতে হবে।' }); return; }
    setBusy('up'); setMsg(null);
    const ext = x.type === 'application/pdf' ? 'pdf' : x.type === 'image/png' ? 'png' : 'jpg';
    const path = `${user.id}/cv-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('cvs').upload(path, x, { contentType: x.type, upsert: false });
    setBusy('');
    if (error) { setMsg({ ok: false, t: 'ফাইল আপলোড হয়নি, আবার চেষ্টা করুন।' }); return; }
    setF({ ...f, cv_path: path });
    setMsg({ ok: true, t: 'ফাইল যোগ হয়েছে — নিচে “সিভি সেভ করুন” চাপুন।' });
  }

  async function viewCv() {
    if (!f?.cv_path) return;
    const { data } = await sb.storage.from('cvs').createSignedUrl(f.cv_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!f) return;
    setBusy('save'); setMsg(null);
    const { error } = await sb.rpc('save_candidate_profile', { p: f });
    setBusy('');
    if (error) { const k = Object.keys(ERR).find((x) => error.message.includes(x)); setMsg({ ok: false, t: k ? ERR[k] : 'সেভ হয়নি, আবার চেষ্টা করুন।' }); return; }
    if (next && next.startsWith('/jobs/')) { router.push(next); return; }
    setMsg({ ok: true, t: 'সিভি সেভ হয়েছে। এখন যেকোনো বিজ্ঞপ্তিতে এক চাপে আবেদন করতে পারবেন।' });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="আমার সিভি ও আবেদন" sub="একবার তৈরি করুন — প্রতিটি আবেদনে এই তথ্য হাসপাতালের কাছে যাবে।" />

      {apps.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold text-ink">আমার আবেদন</h2>
          <ul className="divide-y divide-brand-100">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  {a.jobs ? <Link href={`/jobs/${a.jobs.slug}`} className="font-medium text-ink hover:underline">{a.jobs.post_title} — {a.jobs.hospital_name}</Link> : <span className="text-ink-soft">বিজ্ঞপ্তিটি এখন বন্ধ</span>}
                  <span className="block text-xs text-ink-soft">{bnDate(a.created_at)}</span>
                </span>
                <span className={`chip ${APP_STATUS_BN[a.status]?.tone ?? ''}`}>{APP_STATUS_BN[a.status]?.label ?? a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={save} className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink"><FileUser className="h-5 w-5 text-brand-600" />ব্যক্তিগত তথ্য</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">পূর্ণ নাম *</label><input className="input" required maxLength={100} value={f.full_name} onChange={set('full_name')} /></div>
          <div><label className="label">মোবাইল নম্বর *</label><input className="input" required inputMode="tel" maxLength={30} value={f.phone} onChange={set('phone')} /></div>
          <div><label className="label">ইমেইল</label><input className="input" type="email" maxLength={120} value={f.email ?? ''} onChange={set('email')} /></div>
          <div><label className="label">জেলা</label>
            <select className="input" value={f.district ?? ''} onChange={set('district')}><option value="">বেছে নিন</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label">জন্ম তারিখ</label><input className="input" type="date" value={f.date_of_birth ?? ''} onChange={set('date_of_birth')} /></div>
          <div><label className="label">লিঙ্গ</label>
            <select className="input" value={f.gender ?? ''} onChange={set('gender')}><option value="">বেছে নিন</option><option>মহিলা</option><option>পুরুষ</option><option>অন্যান্য</option></select></div>
        </div>
        <div><label className="label">ঠিকানা</label><input className="input" maxLength={300} value={f.address ?? ''} onChange={set('address')} /></div>

        <h2 className="pt-2 font-semibold text-ink">শিক্ষা ও রেজিস্ট্রেশন</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">শিক্ষাগত যোগ্যতা *</label>
            <select className="input" required value={f.qualification} onChange={set('qualification')}><option value="">বেছে নিন</option>{QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}</select></div>
          <div><label className="label">প্রতিষ্ঠান</label><input className="input" maxLength={150} value={f.institute ?? ''} onChange={set('institute')} placeholder="যেমন: ঢাকা নার্সিং কলেজ" /></div>
          <div><label className="label">পাসের সাল</label><input className="input" inputMode="numeric" maxLength={4} value={f.passing_year ?? ''} onChange={(e) => setF({ ...f, passing_year: e.target.value ? Number(e.target.value.replace(/\D/g, '')) || null : null })} /></div>
          <div><label className="label">BNMC রেজিস্ট্রেশন নম্বর</label><input className="input" maxLength={50} value={f.bnmc_reg ?? ''} onChange={set('bnmc_reg')} /></div>
        </div>

        <h2 className="pt-2 font-semibold text-ink">অভিজ্ঞতা</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">মোট অভিজ্ঞতা (বছর)</label><input className="input" inputMode="decimal" maxLength={4} value={f.experience_years ?? ''} onChange={(e) => setF({ ...f, experience_years: e.target.value === '' ? null : Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} /></div>
          <div><label className="label">বর্তমান কর্মস্থল</label><input className="input" maxLength={150} value={f.current_workplace ?? ''} onChange={set('current_workplace')} /></div>
        </div>
        <div><label className="label">অভিজ্ঞতার বিবরণ</label><textarea className="input min-h-[90px]" maxLength={2000} value={f.experience ?? ''} onChange={set('experience')} placeholder="কোন হাসপাতালে, কোন ওয়ার্ডে (ICU, OT, মেডিসিন…), কত দিন" /></div>
        <div><label className="label">দক্ষতা</label><input className="input" maxLength={500} value={f.skills ?? ''} onChange={set('skills')} placeholder="যেমন: ICU কেয়ার, BLS, কম্পিউটার" /></div>
        <div><label className="label">নিজের সম্পর্কে</label><textarea className="input min-h-[70px]" maxLength={1000} value={f.about ?? ''} onChange={set('about')} /></div>

        <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4">
          <p className="font-semibold text-ink">সিভি / সার্টিফিকেট ফাইল (ঐচ্ছিক)</p>
          <p className="text-xs text-ink-soft">PDF বা ছবি, সর্বোচ্চ ৫ MB। শুধু যে হাসপাতালে আবেদন করবেন তারাই দেখতে পাবে।</p>
          <input ref={file} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => file.current?.click()}><Upload className="h-4 w-4" />{busy === 'up' ? 'আপলোড হচ্ছে…' : f.cv_path ? 'নতুন ফাইল দিন' : 'ফাইল বেছে নিন'}</button>
            {f.cv_path && <button type="button" className="btn-ghost" onClick={viewCv}><FileText className="h-4 w-4" />ফাইল দেখুন</button>}
          </div>
        </div>

        {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.ok && <CheckCircle2 className="mr-1 inline h-4 w-4" />}{msg.t}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-success" disabled={!!busy}>{busy === 'save' ? 'সেভ হচ্ছে…' : next ? 'সিভি সেভ করে আবেদনে ফিরুন' : 'সিভি সেভ করুন'}</button>
          <Link href="/jobs" className="btn-ghost">চাকরির বিজ্ঞপ্তি দেখুন</Link>
        </div>
      </form>
    </div>
  );
}
