import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, CalendarClock, MapPin, Users, Wallet } from 'lucide-react';
import { Crumbs } from '@/components/SeoBlocks';
import { ApplyBox } from '@/components/ApplyBox';
import { bnDate, bnNum } from '@/lib/circulars';
import { bdToday, fetchJobs, safeUrl, type Job } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Job | null> {
  const rows = await fetchJobs(`select=*&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const j = await load(slug);
  if (!j) return { title: 'বিজ্ঞপ্তি পাওয়া যায়নি', robots: { index: false } };
  const title = `${j.post_title} নিয়োগ — ${j.hospital_name}${j.district ? `, ${j.district}` : ''}`;
  const desc = `${j.hospital_name}-এ ${j.post_title}${j.vacancies ? ` পদে ${bnNum(j.vacancies)} জন` : ''} নিয়োগ।${j.deadline ? ` আবেদনের শেষ তারিখ ${bnDate(j.deadline)}।` : ''} যোগ্যতা, বেতন ও আবেদনের নিয়ম।`;
  return {
    title, description: desc,
    alternates: { canonical: `/jobs/${j.slug}` },
    openGraph: { title, description: desc, url: `/jobs/${j.slug}`, type: 'article', images: ['/og.jpg'] },
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-6 text-ink-soft">{value}</dd>
    </div>
  );
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const j = await load(slug);
  if (!j) notFound();
  const closed = !!j.deadline && j.deadline < bdToday();
  const source = safeUrl(j.source_url);

  // Google for Jobs: structured data while the vacancy is open
  const ld = !closed ? {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: j.post_title,
    description: [j.description, j.qualifications && `যোগ্যতা: ${j.qualifications}`, j.salary && `বেতন: ${j.salary}`].filter(Boolean).join('\n') || j.post_title,
    datePosted: j.published_at ?? j.created_at,
    ...(j.deadline ? { validThrough: `${j.deadline}T23:59:59+06:00` } : {}),
    employmentType: j.job_type === 'পার্ট টাইম' ? 'PART_TIME' : j.job_type === 'চুক্তিভিত্তিক' ? 'CONTRACTOR' : j.job_type === 'ইন্টার্নশিপ' ? 'INTERN' : 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', name: j.hospital_name },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location || j.district || undefined, addressRegion: j.district || undefined, addressCountry: 'BD' } },
    ...(j.vacancies ? { totalJobOpenings: j.vacancies } : {}),
    directApply: j.apply_mode === 'site',
  } : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
      <Crumbs items={[['/', 'হোম'], ['/jobs', 'প্রাইভেট চাকরি'], [`/jobs/${j.slug}`, j.post_title]]} />

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-700 to-mint-500 p-5 text-white">
          <span className="chip bg-white text-brand-700">{closed ? 'আবেদন শেষ' : 'আবেদন চলছে'}</span>
          <h1 className="mt-2 text-xl font-bold leading-snug md:text-2xl">{j.post_title} নিয়োগ</h1>
          <p className="mt-1 flex items-center gap-1.5 font-semibold text-white/95"><Building2 className="h-4 w-4" />{j.hospital_name}</p>
        </div>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
          {(j.location || j.district) && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block text-xs text-ink-soft">কর্মস্থল</span><b className="text-ink">{[j.location, j.district].filter(Boolean).join(', ')}</b></span></div>}
          <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block text-xs text-ink-soft">পদ সংখ্যা</span><b className="text-ink">{j.vacancies ? `${bnNum(j.vacancies)} জন` : 'উল্লেখ নেই'}</b></span></div>
          {j.salary && <div className="flex items-start gap-2"><Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block text-xs text-ink-soft">বেতন</span><b className="text-ink">{j.salary}</b></span></div>}
          <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blush-600" /><span><span className="block text-xs text-ink-soft">আবেদনের শেষ তারিখ</span><b className="text-ink">{j.deadline ? bnDate(j.deadline) : 'উল্লেখ নেই'}</b></span></div>
        </div>
      </header>

      <ApplyBox job={{ id: j.id, slug: j.slug, apply_mode: j.apply_mode, apply_url: safeUrl(j.apply_url), apply_info: j.apply_info, closed }} />

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold text-ink">বিস্তারিত</h2>
        <dl className="divide-y divide-brand-100">
          <Row label="পদের নাম" value={j.post_title} />
          <Row label="চাকরির ধরন" value={j.job_type} />
          <Row label="যোগ্যতা ও অভিজ্ঞতা" value={j.qualifications} />
          <Row label="বেতন ও সুবিধা" value={j.salary} />
          <Row label="কাজের বিবরণ" value={j.description} />
          <Row label="আবেদনের নিয়ম / যোগাযোগ" value={j.apply_info} />
          <Row label="প্রকাশের তারিখ" value={j.published_at ? bnDate(j.published_at) : null} />
        </dl>
      </section>

      <aside className="rounded-3xl bg-gradient-to-r from-mint-500 to-brand-600 p-5 text-white">
        <h2 className="text-lg font-bold">সরকারি নার্স হওয়ার প্রস্তুতিও চালিয়ে যান</h2>
        <p className="mt-1 text-sm text-white/90">প্রতি সপ্তাহে ফ্রি মডেল টেস্ট — ডিউটির ফাঁকে সপ্তাহের যেকোনো সময় দিন।</p>
        <Link href="/weekly-test" className="btn mt-3 bg-white text-brand-700 hover:bg-brand-50">সাপ্তাহিক ফ্রি টেস্ট <ArrowRight className="h-4 w-4" /></Link>
      </aside>

      <p className="text-xs leading-5 text-ink-soft">
        {source ? <>সূত্র: <a href={source} target="_blank" rel="noopener noreferrer nofollow" className="underline">মূল বিজ্ঞপ্তি</a>। </> : null}
        আবেদন ফি ছাড়া অন্য কোনো টাকা (জামানত, “নিয়োগ খরচ”) চাইলে দেবেন না এবং আমাদের জানান। <Link href="/jobs" className="underline">সব বিজ্ঞপ্তি →</Link>
      </p>
    </div>
  );
}
