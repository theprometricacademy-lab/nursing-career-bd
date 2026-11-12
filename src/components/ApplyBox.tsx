'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, FileUser, Send } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { trackEvent } from './Tracker';
import { APP_STATUS_BN } from '@/lib/jobs';

type J = { id: number; slug: string; apply_mode: 'site' | 'external'; apply_url: string | null; apply_info: string | null; closed: boolean };

const ERR: Record<string, string> = {
  cv_required: 'আগে আপনার সিভি তৈরি করুন।', already_applied: 'আপনি আগেই আবেদন করেছেন।', deadline_passed: 'আবেদনের সময় শেষ।',
  rate_limited: 'আজ অনেক আবেদন করেছেন, কাল আবার চেষ্টা করুন।', own_job: 'নিজের হাসপাতালের বিজ্ঞপ্তিতে আবেদন করা যায় না।',
};

/** Apply on this site with the saved CV, or go to the hospital's own link. */
export function ApplyBox({ job }: { job: J }) {
  const { user, ready } = useApp();
  const [hasCv, setHasCv] = useState<boolean | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user || job.apply_mode !== 'site') return;
    const sb = supabaseBrowser();
    sb.from('candidate_profiles').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setHasCv(!!data));
    sb.from('job_applications').select('status').eq('job_id', job.id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setApplied((data as { status: string } | null)?.status ?? null));
  }, [user, job.id, job.apply_mode]);

  async function apply() {
    setBusy(true); setMsg('');
    const { error } = await supabaseBrowser().rpc('apply_job', { p_job: job.id, p_note: note || null });
    setBusy(false);
    if (error) { const k = Object.keys(ERR).find((x) => error.message.includes(x)); setMsg(k ? ERR[k] : 'আবেদন হয়নি, আবার চেষ্টা করুন।'); return; }
    trackEvent('/jobs/applied');
    setApplied('submitted');
  }

  if (job.closed) return <section className="card p-5 text-center text-ink-soft">এই বিজ্ঞপ্তির আবেদনের সময় শেষ হয়ে গেছে।</section>;

  if (job.apply_mode === 'external') {
    return (
      <section className="card p-5">
        <h2 className="font-bold text-ink">কীভাবে আবেদন করবেন</h2>
        {job.apply_info && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{job.apply_info}</p>}
        {job.apply_url && (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => trackEvent('/jobs/external-apply')} className="btn-pink mt-3">
            হাসপাতালের লিংকে আবেদন করুন <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <p className="mt-2 text-xs text-ink-soft">এই বিজ্ঞপ্তিতে আবেদন হাসপাতালের নিজের ঠিকানায় হয়; Nursing Career BD শুধু খবরটি জানাচ্ছে।</p>
      </section>
    );
  }

  return (
    <section className="card border-mint-200 p-5">
      <h2 className="font-bold text-ink">এখান থেকেই আবেদন করুন</h2>
      {!ready ? null : !user ? (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">আবেদন করতে ফ্রি অ্যাকাউন্টে লগইন করুন। একবার সিভি তৈরি করলে প্রতিটি আবেদন এক চাপে।</p>
          <Link href={`/login?next=${encodeURIComponent(`/jobs/${job.slug}`)}`} className="btn-primary mt-3">লগইন / ফ্রি অ্যাকাউন্ট</Link>
        </div>
      ) : applied ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-mint-600" /><b className="text-ink">আপনার আবেদন জমা হয়েছে।</b>
          <span className={`chip ${APP_STATUS_BN[applied]?.tone ?? ''}`}>{APP_STATUS_BN[applied]?.label ?? applied}</span>
          <Link href="/jobs/my-cv" className="text-brand-700 underline">আমার সব আবেদন</Link>
        </div>
      ) : hasCv === false ? (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">আবেদনের আগে একবার আপনার সিভি তৈরি করুন (২–৩ মিনিট লাগবে)।</p>
          <Link href={`/jobs/my-cv?next=${encodeURIComponent(`/jobs/${job.slug}`)}`} className="btn-primary mt-3"><FileUser className="h-4 w-4" />সিভি তৈরি করুন</Link>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea className="input min-h-[80px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="হাসপাতালকে ছোট করে কিছু জানাতে চাইলে লিখুন (ঐচ্ছিক) — যেমন: কবে থেকে যোগ দিতে পারবেন" />
          <button className="btn-success w-full !py-3 text-base sm:w-auto sm:px-8" disabled={busy || hasCv === null} onClick={apply}>
            <Send className="h-4 w-4" />{busy ? 'জমা হচ্ছে…' : 'আমার সিভি দিয়ে আবেদন করুন'}
          </button>
          <p className="text-xs text-ink-soft">আপনার সিভির তথ্য শুধু এই হাসপাতাল দেখতে পাবে। <Link href="/jobs/my-cv" className="underline">সিভি দেখুন / বদলান</Link></p>
        </div>
      )}
      {msg && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
    </section>
  );
}
