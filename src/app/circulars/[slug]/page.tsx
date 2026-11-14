import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, CalendarClock, ExternalLink, FileText, Landmark, Users } from 'lucide-react';
import { Crumbs } from '@/components/SeoBlocks';
import { bnDate, bnNum, fetchCirculars, JOB_TYPE_BN, status, type Circular } from '@/lib/circulars';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Circular | null> {
  const rows = await fetchCirculars(`select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) return { title: 'সার্কুলার পাওয়া যায়নি' };
  const desc = `${c.org_bn}${c.total_posts ? ` — ${bnNum(c.total_posts)} পদ` : ''}। আবেদনের শেষ তারিখ ${bnDate(c.apply_end)}। যোগ্যতা, বেতন, বয়সসীমা, আবেদনের নিয়ম ও সার্কুলারের PDF।`;
  return {
    title: c.title_bn, description: desc,
    alternates: { canonical: `/circulars/${c.slug}` },
    openGraph: { title: c.title_bn, description: desc, url: `/circulars/${c.slug}`, type: 'article', images: ['/og.jpg'] },
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className="text-sm leading-6 text-ink-soft">{value}</dd>
    </div>
  );
}

export default async function CircularPage({ params }: Props) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) notFound();
  const st = status(c);
  const isPdf = !!c.pdf_url && /\.pdf($|\?)/i.test(c.pdf_url);

  // Structured data so the circular can appear in Google's job listings while it is open
  const ld = st.key !== 'closed' ? {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: c.post_name_bn || c.title_bn,
    description: [c.title_bn, c.details_bn, c.qualification_bn && `যোগ্যতা: ${c.qualification_bn}`, c.salary_bn && `বেতন: ${c.salary_bn}`].filter(Boolean).join('\n'),
    datePosted: c.publish_at ?? c.apply_start ?? undefined,
    validThrough: c.apply_end ?? undefined,
    employmentType: c.job_type === 'contract' ? 'CONTRACTOR' : 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', name: c.org_bn, sameAs: c.official_url ?? undefined },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'BD' } },
    ...(c.total_posts ? { totalJobOpenings: c.total_posts } : {}),
    directApply: false,
  } : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <Crumbs items={[['/', 'হোম'], ['/circulars', 'সার্কুলার'], [`/circulars/${c.slug}`, c.title_bn]]} />

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-r from-blush-600 to-blush-500 p-5 text-white">
          <div className="flex flex-wrap gap-2">
            <span className="chip bg-white text-blush-700">{st.label}</span>
            <span className="chip bg-white/20 text-white">{JOB_TYPE_BN[c.job_type]}</span>
          </div>
          <h1 className="mt-2 text-xl font-bold leading-snug md:text-2xl">{c.title_bn}</h1>
        </div>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block text-xs text-ink-soft">প্রতিষ্ঠান</span><b className="text-ink">{c.org_bn}</b></span></div>
          <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block text-xs text-ink-soft">পদ সংখ্যা</span><b className="text-ink">{c.total_posts ? bnNum(c.total_posts) : 'বিজ্ঞপ্তি দেখুন'}</b></span></div>
          <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blush-600" /><span><span className="block text-xs text-ink-soft">আবেদনের শেষ তারিখ</span><b className="text-ink">{bnDate(c.apply_end)}</b></span></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-brand-100 p-4">
          {c.apply_url && st.key !== 'closed' && (
            <a href={c.apply_url} target="_blank" rel="noopener noreferrer" className="btn-pink">অনলাইনে আবেদন <ExternalLink className="h-4 w-4" /></a>
          )}
          {c.pdf_url && <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><FileText className="h-4 w-4" />সার্কুলার PDF</a>}
          {c.official_url && <a href={c.official_url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><Landmark className="h-4 w-4" />অফিসিয়াল ওয়েবসাইট</a>}
        </div>
      </header>

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold text-ink">বিস্তারিত তথ্য</h2>
        <dl className="divide-y divide-brand-100">
          <Row label="নিয়োগকারী প্রতিষ্ঠান" value={c.org_bn} />
          <Row label="মন্ত্রণালয় / বিভাগ" value={c.ministry_bn} />
          <Row label="নিয়োগ পরীক্ষা নেবে" value={c.recruiter_bn} />
          <Row label="বিজ্ঞপ্তি নম্বর" value={c.circular_no} />
          <Row label="পদের নাম" value={c.post_name_bn} />
          <Row label="গ্রেড" value={c.grade_bn} />
          <Row label="বেতন" value={c.salary_bn} />
          <Row label="শিক্ষাগত যোগ্যতা" value={c.qualification_bn} />
          <Row label="বয়সসীমা" value={c.age_limit_bn} />
          <Row label="প্রকাশের তারিখ" value={c.publish_at ? bnDate(c.publish_at) : null} />
          <Row label="আবেদন শুরু" value={c.apply_start ? bnDate(c.apply_start) : null} />
          <Row label="আবেদনের শেষ তারিখ" value={bnDate(c.apply_end)} />
          <Row label="আবেদন ফি" value={c.fee_bn} />
          <Row label="অন্যান্য তথ্য" value={c.details_bn} />
          <Row label="পরীক্ষার হালনাগাদ" value={c.exam_info_bn} />
        </dl>
      </section>

      {c.pdf_url && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-4">
            <h2 className="font-bold text-ink">সার্কুলারের কপি</h2>
            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 underline">নতুন ট্যাবে খুলুন / ডাউনলোড</a>
          </div>
          {isPdf ? (
            <object data={c.pdf_url} type="application/pdf" className="h-[70vh] w-full border-t border-brand-100">
              <p className="p-4 text-sm text-ink-soft">আপনার ব্রাউজারে PDF এখানে দেখা যাচ্ছে না। <a href={c.pdf_url} className="text-brand-700 underline" target="_blank" rel="noopener noreferrer">এখানে চাপুন</a>।</p>
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.pdf_url} alt={c.title_bn} className="w-full border-t border-brand-100" loading="lazy" />
          )}
        </section>
      )}

      <aside className="rounded-3xl bg-gradient-to-r from-mint-500 to-brand-600 p-5 text-white">
        <h2 className="text-lg font-bold">এই পরীক্ষার প্রস্তুতি নিন</h2>
        <p className="mt-1 text-sm text-white/90">নার্সিং নিয়োগ পরীক্ষার ধরনে ১১,০০০+ প্রশ্ন ও PSC প্যাটার্নের মডেল টেস্ট।</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/mock-tests" className="btn bg-white text-brand-700 hover:bg-brand-50">মডেল টেস্ট দিন <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/senior-staff-nurse" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20">প্রস্তুতি গাইড</Link>
        </div>
      </aside>

      <p className="text-xs leading-5 text-ink-soft">
        সূত্র: {c.source_url ? <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline">{c.source_name || c.source_url}</a> : (c.source_name || '—')}। তথ্যগুলো সরকারি বিজ্ঞপ্তি ও জাতীয় দৈনিক থেকে সংগৃহীত; আবেদনের আগে অবশ্যই মূল বিজ্ঞপ্তি ও অফিসিয়াল ওয়েবসাইট মিলিয়ে নিন। <Link href="/circulars" className="underline">সব সার্কুলার →</Link>
      </p>
    </div>
  );
}
