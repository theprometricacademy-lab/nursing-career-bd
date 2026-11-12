import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Building2, CalendarClock, FileUser, MapPin, Search, Users } from 'lucide-react';
import { Crumbs } from '@/components/SeoBlocks';
import { JobTabs } from '@/components/JobTabs';
import { bnDate, bnNum } from '@/lib/circulars';
import { DISTRICTS, fetchJobs, openJobsQuery } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'প্রাইভেট হাসপাতালে নার্স নিয়োগ ২০২৬ — স্টাফ নার্স চাকরি',
  description: 'বাংলাদেশের প্রাইভেট হাসপাতাল ও ক্লিনিকে স্টাফ নার্স, সিনিয়র স্টাফ নার্স ও মিডওয়াইফ নিয়োগের সর্বশেষ বিজ্ঞপ্তি। একবার সিভি তৈরি করে সরাসরি আবেদন করুন।',
  alternates: { canonical: '/jobs' },
  openGraph: { title: 'প্রাইভেট হাসপাতালে নার্স নিয়োগ · Nursing Career BD', url: '/jobs', images: ['/og.jpg'] },
};

type Props = { searchParams: Promise<{ d?: string; q?: string }> };

export default async function JobsPage({ searchParams }: Props) {
  const { d, q } = await searchParams;
  const district = d && DISTRICTS.includes(d) ? d : '';
  const term = (q ?? '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 60);
  // the open-jobs filter already uses or=(…), so the text search is applied here on the (small) result
  const all = await fetchJobs(openJobsQuery(district ? `&district=eq.${encodeURIComponent(district)}` : ''));
  const jobs = term ? all.filter((j) => `${j.post_title} ${j.hospital_name} ${j.location ?? ''}`.toLowerCase().includes(term.toLowerCase())) : all;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Crumbs items={[['/', 'হোম'], ['/jobs', 'প্রাইভেট চাকরি']]} />
      <JobTabs active="private" />
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 text-white shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><Briefcase className="h-5 w-5" />শুধু নার্সদের জন্য</div>
        <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">প্রাইভেট হাসপাতালে নার্স নিয়োগ</h1>
        <p className="mt-1 text-sm text-white/90">বাংলাদেশের প্রাইভেট হাসপাতাল ও ক্লিনিকের নার্স নিয়োগ বিজ্ঞপ্তি এক জায়গায়। একবার সিভি তৈরি করুন, তারপর এক চাপে আবেদন।</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/jobs/my-cv" className="btn bg-white text-brand-700 hover:bg-brand-50"><FileUser className="h-4 w-4" />আমার সিভি ও আবেদন</Link>
          <Link href="/hospital" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20"><Building2 className="h-4 w-4" />হাসপাতাল? ফ্রিতে বিজ্ঞপ্তি দিন</Link>
        </div>
      </header>

      <form className="card grid gap-2 p-3 sm:grid-cols-[1fr_180px_auto]" action="/jobs">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
          <input name="q" defaultValue={term} className="input pl-9" placeholder="পদ বা হাসপাতালের নাম" /></div>
        <select name="d" defaultValue={district} className="input">
          <option value="">সব জেলা</option>
          {DISTRICTS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <button className="btn-primary">খুঁজুন</button>
      </form>

      {jobs.length === 0 ? (
        <div className="card p-6 text-center text-ink-soft">
          {district || term ? 'এই খোঁজে এখন কোনো খোলা বিজ্ঞপ্তি নেই।' : 'এখন কোনো খোলা বিজ্ঞপ্তি নেই। নতুন বিজ্ঞপ্তি এলেই এখানে দেখাবে।'}
          {(district || term) && <div className="mt-2"><Link href="/jobs" className="text-brand-700 underline">সব বিজ্ঞপ্তি দেখুন</Link></div>}
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.slug}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${j.apply_mode === 'site' ? 'bg-mint-100 text-mint-700' : 'bg-brand-100 text-brand-700'}`}>
                    {j.apply_mode === 'site' ? 'এখান থেকেই আবেদন' : 'হাসপাতালের লিংকে আবেদন'}
                  </span>
                  {j.job_type && <span className="chip bg-slate-100 text-slate-700">{j.job_type}</span>}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-ink">{j.post_title}</h2>
                <p className="flex items-center gap-1.5 font-semibold text-brand-700"><Building2 className="h-4 w-4" />{j.hospital_name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                  {(j.location || j.district) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{[j.location, j.district].filter(Boolean).join(', ')}</span>}
                  {j.vacancies && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{bnNum(j.vacancies)} জন</span>}
                  <span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" />{j.deadline ? `শেষ তারিখ ${bnDate(j.deadline)}` : 'শেষ তারিখ উল্লেখ নেই'}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-5 text-ink-soft">
        সতর্কতা: কোনো চাকরির জন্য আবেদন ফি ছাড়া অন্য কোনো টাকা (জামানত, “নিয়োগ খরচ” ইত্যাদি) চাইলে টাকা দেবেন না এবং আমাদের জানান। আবেদনের আগে হাসপাতালের তথ্য নিজে যাচাই করুন।
      </p>
    </div>
  );
}
