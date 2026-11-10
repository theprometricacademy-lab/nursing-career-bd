import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Timer } from 'lucide-react';
import { Article, Crumbs, Cta, GuideLinks, Hero, Section } from '@/components/SeoBlocks';
import { McqList } from '@/components/McqList';
import { bn, bnExamDate, listPapers, paperQuestions, paperTitle } from '@/lib/examPapers';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function find(slug: string) {
  return (await listPapers()).find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await find(slug);
  if (!p) return {};
  const title = paperTitle(p);
  const desc = `${p.name_bn} নিয়োগ পরীক্ষার ${bn(p.total)}টি MCQ প্রশ্ন ও সঠিক উত্তর${p.exam_date ? ` (পরীক্ষা: ${bnExamDate(p.exam_date)})` : ''}। অনলাইনে টাইমারসহ পরীক্ষাও দিতে পারবেন।`;
  return {
    title, description: desc,
    keywords: [`সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান ${p.year}`, `senior staff nurse question solution ${p.year}`, 'নার্সিং নিয়োগ পরীক্ষার প্রশ্ন', p.name_en],
    alternates: { canonical: `/question-solution/${p.slug}` },
    openGraph: { title: `${title} · Nursing Career BD`, description: desc, url: `/question-solution/${p.slug}`, type: 'article', images: ['/og.jpg'] },
  };
}

export default async function PaperPage({ params }: Props) {
  const { slug } = await params;
  const p = await find(slug);
  if (!p) notFound();
  const items = await paperQuestions(slug);
  const partial = p.name_bn.includes('আংশিক');

  // Structured data so Google can show the questions as practice problems
  const ld = {
    '@context': 'https://schema.org', '@type': 'Quiz', name: paperTitle(p), inLanguage: 'bn', educationalLevel: 'Nursing recruitment exam',
    hasPart: items.slice(0, 50).map((q) => ({
      '@type': 'Question', eduQuestionType: 'Multiple choice', text: q.question_bn,
      acceptedAnswer: { '@type': 'Answer', text: q.options_bn[q.correct_option] },
      suggestedAnswer: q.options_bn.filter((_, k) => k !== q.correct_option).map((o) => ({ '@type': 'Answer', text: o })),
    })),
  };

  return (
    <Article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Crumbs items={[['/', 'হোম'], ['/question-solution', 'প্রশ্ন সমাধান'], [`/question-solution/${p.slug}`, `${bn(p.year)}`]]} />
      <Hero title={paperTitle(p)}
        sub={`${p.exam_date ? `পরীক্ষার তারিখ: ${bnExamDate(p.exam_date)} · ` : ''}${bn(items.length)}টি প্রশ্ন, প্রতিটির সঠিক উত্তরসহ।${partial ? ' (এই পরীক্ষার যতগুলো প্রশ্ন পাওয়া গেছে ততগুলো দেওয়া হয়েছে।)' : ''}`}
        updated="নভেম্বর ২০২৬" />

      <div className="mb-4">
        <Link href="/previous-questions" className="btn-success inline-flex"><Timer className="h-4 w-4" />এই প্রশ্নে আসল পরীক্ষার মতো পরীক্ষা দিন</Link>
      </div>

      <Section title="প্রশ্ন ও সঠিক উত্তর">
        {items.length > 0 ? <McqList items={items} /> : <p>প্রশ্ন এই মুহূর্তে লোড করা যায়নি।</p>}
      </Section>

      <Cta title="আরও প্রস্তুতি নিন" sub="১০,০০০+ ব্যাখ্যাসহ প্রশ্ন, PSC প্যাটার্নে মডেল টেস্ট ও সাপ্তাহিক লিডারবোর্ড।" />
      <Section title="অন্যান্য সালের প্রশ্ন সমাধান">
        <Link href="/question-solution" className="font-semibold text-brand-700 underline">সব পরীক্ষার প্রশ্ন সমাধান দেখুন</Link>
      </Section>
      <GuideLinks />
    </Article>
  );
}
