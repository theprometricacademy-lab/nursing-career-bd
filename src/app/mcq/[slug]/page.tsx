import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Article, Crumbs, Cta, GuideLinks, Hero, Section } from '@/components/SeoBlocks';
import { McqList } from '@/components/McqList';
import { SEO_SUBJECTS, rpc, type SampleQ } from '@/lib/seoSubjects';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = SEO_SUBJECTS.find((x) => x.slug === slug);
  if (!s) return {};
  const title = `${s.bn} MCQ প্রশ্ন ও উত্তর — ${s.en} MCQ`;
  const desc = `${s.bn} (${s.en}) বিষয়ের বাছাই করা কঠিন ও মাঝারি MCQ প্রশ্ন, সঠিক উত্তর ও ব্যাখ্যা। সিনিয়র স্টাফ নার্স ও নার্সিং নিয়োগ পরীক্ষার প্রস্তুতির জন্য।`;
  return {
    title, description: desc,
    keywords: [`${s.bn} MCQ`, `${s.en} MCQ`, `${s.en} MCQ question with answer`, 'সিনিয়র স্টাফ নার্স প্রশ্ন', 'nursing MCQ'],
    alternates: { canonical: `/mcq/${s.slug}` },
    openGraph: { title: `${title} · Nursing Career BD`, description: desc, url: `/mcq/${s.slug}`, type: 'article', images: ['/og.jpg'] },
  };
}

export default async function SubjectMcqPage({ params }: Props) {
  const { slug } = await params;
  const s = SEO_SUBJECTS.find((x) => x.slug === slug);
  if (!s) notFound();
  const items = (await rpc<SampleQ[]>('public_sample_questions', { p_slug: slug, p_limit: 25 })) ?? [];
  const others = SEO_SUBJECTS.filter((x) => x.slug !== slug && x.nursing === s.nursing);

  return (
    <Article>
      <Crumbs items={[['/', 'হোম'], ['/nursing-mcq', 'MCQ প্রশ্ন ও উত্তর'], [`/mcq/${s.slug}`, s.bn]]} />
      <Hero title={`${s.bn} MCQ প্রশ্ন ও উত্তর (ব্যাখ্যাসহ)`}
        sub={`${s.en} বিষয়ে সিনিয়র স্টাফ নার্স ও নার্সিং নিয়োগ পরীক্ষার ধরনে বাছাই করা ${items.length || 25}টি কঠিন ও মাঝারি প্রশ্ন। প্রতিটির সঠিক উত্তর ও ব্যাখ্যা দেওয়া আছে।`}
        updated="নভেম্বর ২০২৬" />

      <Section title={`${s.bn} — নমুনা প্রশ্ন`}>
        {items.length > 0 ? <McqList items={items} /> : (
          <p>প্রশ্ন এই মুহূর্তে লোড করা যায়নি। <Link href="/question-bank" className="text-brand-700 underline">প্রশ্নব্যাংকে</Link> সরাসরি অনুশীলন করুন।</p>
        )}
        <p className="pt-2">এগুলো নমুনা মাত্র। <b>{s.bn}</b> বিষয়ের আরও শত শত প্রশ্ন টপিক ও কঠিনতা অনুযায়ী অনুশীলন করতে <Link href="/question-bank" className="font-semibold text-brand-700 underline">প্রশ্নব্যাংক</Link> খুলুন, অথবা <Link href="/mock-tests" className="font-semibold text-brand-700 underline">মডেল টেস্ট</Link> দিয়ে নিজেকে যাচাই করুন।</p>
      </Section>

      <Cta title="পুরো প্রস্তুতি নিন এক জায়গায়" sub="১১,০০০+ ব্যাখ্যাসহ প্রশ্ন, PSC প্যাটার্নে ১০০ নম্বরের মডেল টেস্ট ও বিষয়ভিত্তিক ফলাফল বিশ্লেষণ।" />

      <Section title="অন্যান্য বিষয়ের MCQ">
        <div className="flex flex-wrap gap-2">
          {others.map((o) => <Link key={o.slug} href={`/mcq/${o.slug}`} className="chip bg-brand-50 py-1.5 text-sm text-brand-800 hover:bg-brand-100">{o.bn}</Link>)}
        </div>
      </Section>
      <GuideLinks />
    </Article>
  );
}
