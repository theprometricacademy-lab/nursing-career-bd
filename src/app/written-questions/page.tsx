import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, FileText, Mail } from 'lucide-react';
import { Article, Crumbs, Hero, Section, GuideLinks } from '@/components/SeoBlocks';
import { PyqTabs } from '@/components/PyqTabs';
import { PyqUpload } from '@/components/PyqUpload';
import { listWritten } from '@/lib/writtenPapers';
import { bn, bnExamDate } from '@/lib/examPapers';
// plain constants (LegalPage is a client module, so its exports can't be read here)
const SUPPORT_EMAIL = 'nursingcareerbd@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/share/1Ej43zxCY7/';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'সিনিয়র স্টাফ নার্স লিখিত পরীক্ষার প্রশ্ন ও উত্তর — বিগত সালের',
  description: 'সিনিয়র স্টাফ নার্সসহ সরকারি নার্সিং নিয়োগের বিগত সালের লিখিত পরীক্ষার প্রশ্ন, নম্বর বণ্টন ও নমুনা উত্তর।',
  keywords: ['সিনিয়র স্টাফ নার্স লিখিত প্রশ্ন', 'নার্সিং লিখিত পরীক্ষার প্রশ্ন', 'senior staff nurse written question', 'নার্স নিয়োগ লিখিত পরীক্ষা'],
  alternates: { canonical: '/written-questions' },
};

export default async function WrittenListPage() {
  const papers = await listWritten();
  return (
    <Article>
      <Crumbs items={[['/', 'হোম'], ['/previous-questions', 'বিগত সালের প্রশ্ন'], ['/written-questions', 'লিখিত পরীক্ষা']]} />
      <PyqTabs active="written" />
      <Hero title="বিগত সালের লিখিত পরীক্ষার প্রশ্ন ও উত্তর"
        sub="সরকারি নার্সিং নিয়োগের লিখিত পরীক্ষার আসল প্রশ্ন, প্রতিটির নম্বরসহ। প্রতিটি প্রশ্নের নিচে নমুনা উত্তর।" updated="নভেম্বর ২০২৬" />
      <PyqUpload defaultType="written" />

      {papers.length === 0 ? (
        <Section title="শীঘ্রই আসছে">
          <p>বিগত সালের লিখিত পরীক্ষার প্রশ্ন ও নমুনা উত্তর যোগ করার কাজ চলছে।</p>
          <p>আপনার কাছে কোনো লিখিত পরীক্ষার প্রশ্নপত্রের ছবি বা PDF থাকলে আমাদের পাঠান — সবার উপকার হবে:</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={FACEBOOK_URL} target="_blank" rel="noopener" className="btn bg-[#1877F2] text-white">Facebook পেজে পাঠান</a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('লিখিত পরীক্ষার প্রশ্ন')}`} className="btn-ghost"><Mail className="h-4 w-4" />{SUPPORT_EMAIL}</a>
          </div>
        </Section>
      ) : (
        <div className="flex flex-col gap-3">
          {papers.map((p) => (
            <Link key={p.slug} href={`/written-questions/${p.slug}`} className="card flex items-center gap-3 p-4 transition hover:border-brand-300">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug text-ink">{p.title_bn}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                  <CalendarDays className="h-3.5 w-3.5" />{p.exam_date ? bnExamDate(p.exam_date) : bn(p.year)}
                  {p.total_marks ? <span>· পূর্ণমান {bn(p.total_marks)}</span> : null}
                  <span>· {bn(p.questions)}টি প্রশ্ন</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <GuideLinks />
    </Article>
  );
}
