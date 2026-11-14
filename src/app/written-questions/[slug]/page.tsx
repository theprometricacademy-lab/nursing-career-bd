import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Article, Crumbs, Cta, GuideLinks, Hero, Section } from '@/components/SeoBlocks';
import { PyqTabs } from '@/components/PyqTabs';
import { SECTION_BN, SECTION_ORDER, writtenPaper } from '@/lib/writtenPapers';
import { bn, bnExamDate } from '@/lib/examPapers';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await writtenPaper(slug);
  if (!d) return {};
  const t = `${d.paper.title_bn} — লিখিত প্রশ্ন ও উত্তর`;
  const desc = `${d.paper.title_bn} লিখিত পরীক্ষার ${bn(d.questions.length)}টি প্রশ্ন${d.paper.exam_date ? ` (পরীক্ষা: ${bnExamDate(d.paper.exam_date)})` : ''}, নম্বরসহ ও নমুনা উত্তর।`;
  return { title: t, description: desc, alternates: { canonical: `/written-questions/${slug}` },
    openGraph: { title: `${t} · Nursing Career BD`, description: desc, url: `/written-questions/${slug}`, type: 'article', images: ['/og.jpg'] } };
}

export default async function WrittenPaperPage({ params }: Props) {
  const { slug } = await params;
  const d = await writtenPaper(slug);
  if (!d) notFound();
  const { paper: p, questions } = d;
  const sections = SECTION_ORDER.filter((s) => questions.some((q) => q.section === s));
  const meta = [p.org_bn, p.exam_date ? `পরীক্ষা: ${bnExamDate(p.exam_date)}` : null, p.total_marks ? `পূর্ণমান: ${bn(p.total_marks)}` : null, p.duration_bn ? `সময়: ${p.duration_bn}` : null].filter(Boolean).join(' · ');

  return (
    <Article>
      <Crumbs items={[['/', 'হোম'], ['/written-questions', 'লিখিত পরীক্ষা'], [`/written-questions/${slug}`, bn(p.year)]]} />
      <PyqTabs active="written" />
      <Hero title={`${p.title_bn} — লিখিত প্রশ্ন ও উত্তর`} sub={meta || 'লিখিত পরীক্ষার প্রশ্ন ও নমুনা উত্তর'} updated="নভেম্বর ২০২৬" />
      {sections.map((s) => (
        <Section key={s} title={SECTION_BN[s] ?? s}>
          <ol className="!ml-0 !list-none space-y-4">
            {questions.filter((q) => q.section === s).map((q, k) => (
              <li key={k} className="!ml-0 rounded-2xl border border-brand-100 p-4">
                <div className="flex items-start gap-3">
                  {q.q_no && <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-700">{q.q_no}</span>}
                  <p className="flex-1 whitespace-pre-line font-semibold text-ink">{q.question}</p>
                  {q.marks != null && <span className="shrink-0 text-xs font-semibold text-ink-soft">{bn(q.marks)} নম্বর</span>}
                </div>
                {q.answer ? (
                  <details className="mt-3 rounded-xl bg-mint-50/60 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-mint-700">নমুনা উত্তর দেখুন</summary>
                    <div className="mt-2 whitespace-pre-line text-[15px] leading-7 text-ink">{q.answer}</div>
                  </details>
                ) : <p className="mt-2 text-xs text-ink-soft">নমুনা উত্তর শীঘ্রই যোগ হবে।</p>}
              </li>
            ))}
          </ol>
        </Section>
      ))}
      {p.source_note && <p className="text-xs text-ink-soft">সূত্র: {p.source_note}</p>}
      <Cta title="MCQ প্রস্তুতিও নিন" sub="প্রিলিমিনারির জন্য ১১,০০০+ ব্যাখ্যাসহ প্রশ্ন আর PSC প্যাটার্নে মডেল টেস্ট।" />
      <Section title="অন্যান্য লিখিত প্রশ্ন"><Link href="/written-questions" className="font-semibold text-brand-700 underline">সব লিখিত পরীক্ষার প্রশ্ন দেখুন</Link></Section>
      <GuideLinks />
    </Article>
  );
}
