import type { Metadata } from 'next';
import Link from 'next/link';
import { BellRing, Building2, CalendarClock, Users } from 'lucide-react';
import { Crumbs } from '@/components/SeoBlocks';
import { JobTabs } from '@/components/JobTabs';
import { bnDate, bnNum, fetchCirculars, JOB_TYPE_BN, status, type Circular } from '@/lib/circulars';

export const dynamic = 'force-dynamic';

const DESC = 'বাংলাদেশের সরকারি নার্সিং চাকরির সব নিয়োগ বিজ্ঞপ্তি এক জায়গায়: সিনিয়র স্টাফ নার্স, মিডওয়াইফ, সশস্ত্র বাহিনীর নার্স ও অন্যান্য পদ। আবেদনের তারিখ, যোগ্যতা, বেতন ও সার্কুলারের PDF।';

export const metadata: Metadata = {
  title: 'সরকারি নার্সিং চাকরির সার্কুলার ২০২৬ — নার্স নিয়োগ বিজ্ঞপ্তি',
  description: DESC,
  keywords: ['নার্স নিয়োগ বিজ্ঞপ্তি ২০২৬', 'সরকারি নার্সিং চাকরি', 'সিনিয়র স্টাফ নার্স নিয়োগ বিজ্ঞপ্তি', 'nursing job circular 2026', 'govt nurse job circular bd', 'staff nurse job circular'],
  alternates: { canonical: '/circulars' },
  openGraph: { title: 'সরকারি নার্সিং চাকরির সার্কুলার · Nursing Career BD', description: DESC, url: '/circulars', images: ['/og.jpg'] },
};

function Card({ c }: { c: Circular }) {
  const st = status(c);
  return (
    <Link href={`/circulars/${c.slug}`} className={`card block p-4 transition hover:-translate-y-0.5 hover:shadow-md ${st.key === 'closed' ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${st.tone}`}>{st.label}</span>
        <span className="chip bg-brand-50 text-brand-700">{JOB_TYPE_BN[c.job_type]}</span>
      </div>
      <h2 className="mt-2 font-bold leading-snug text-ink">{c.title_bn}</h2>
      <div className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-3">
        <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 shrink-0 text-brand-600" />{c.org_bn}</span>
        {c.total_posts ? <span className="flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0 text-brand-600" />{bnNum(c.total_posts)} পদ</span> : <span />}
        <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 shrink-0 text-brand-600" />শেষ: {bnDate(c.apply_end)}</span>
      </div>
    </Link>
  );
}

export default async function CircularsPage() {
  const all = await fetchCirculars('select=*&order=apply_end.desc.nullslast&limit=200');
  const now = Date.now();
  const open = all.filter((c) => status(c, now).key !== 'closed').sort((a, b) => String(a.apply_end).localeCompare(String(b.apply_end)));
  const closed = all.filter((c) => status(c, now).key === 'closed');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Crumbs items={[['/', 'হোম'], ['/circulars', 'চাকরির সার্কুলার']]} />
      <JobTabs active="govt" />
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blush-600 to-blush-500 p-6 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <span className="chip bg-white/20 text-white"><BellRing className="h-3.5 w-3.5" />নিয়মিত হালনাগাদ</span>
          <h1 className="mt-2 text-2xl font-bold">সরকারি নার্সিং চাকরির সার্কুলার</h1>
          <p className="mt-2 text-sm text-white/90">সিনিয়র স্টাফ নার্স, মিডওয়াইফ, সশস্ত্র বাহিনী ও অন্যান্য সরকারি দপ্তরের নার্সিং পদের নিয়োগ বিজ্ঞপ্তি। প্রতিটির বিস্তারিত, আবেদনের লিংক ও সার্কুলারের PDF।</p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">আবেদন চলছে ({bnNum(open.length)})</h2>
        {open.length ? open.map((c) => <Card key={c.id} c={c} />) : (
          <p className="card p-4 text-sm text-ink-soft">এই মুহূর্তে কোনো সরকারি নার্সিং সার্কুলারে আবেদন চলছে না। নতুন সার্কুলার এলেই এখানে যোগ হবে।</p>
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">আগের সার্কুলার (গত ২ বছর)</h2>
          {closed.map((c) => <Card key={c.id} c={c} />)}
        </section>
      )}

      <aside className="card p-5 text-sm text-ink-soft">
        <b className="text-ink">পরীক্ষার প্রস্তুতি নিন:</b> সার্কুলারে আবেদনের পর <Link href="/senior-staff-nurse" className="text-brand-700 underline">সিনিয়র স্টাফ নার্স প্রস্তুতি গাইড</Link> পড়ুন এবং <Link href="/mock-tests" className="text-brand-700 underline">PSC প্যাটার্নের মডেল টেস্ট</Link> দিন।
        <p className="mt-2 text-xs">তথ্যগুলো সরকারি বিজ্ঞপ্তি ও জাতীয় দৈনিক থেকে সংগৃহীত। আবেদনের আগে অবশ্যই মূল বিজ্ঞপ্তি মিলিয়ে নিন।</p>
      </aside>
    </div>
  );
}
