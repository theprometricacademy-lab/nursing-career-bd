import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, FileText } from 'lucide-react';
import { Article, Crumbs, Cta, Faq, GuideLinks, Hero, Section } from '@/components/SeoBlocks';
import { bn, bnExamDate, listPapers, paperTitle } from '@/lib/examPapers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান — বিগত সব নার্সিং নিয়োগ পরীক্ষার প্রশ্ন ও উত্তর',
  description: 'পিএসসি, নার্সিং ও মিডওয়াইফারি অধিদপ্তর, সেবা পরিদপ্তরসহ সরকারি নার্সিং নিয়োগ পরীক্ষার (২০১৬–২০২৬) সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান — সঠিক উত্তরসহ, সাল অনুযায়ী সাজানো।',
  keywords: ['সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান', 'senior staff nurse question solution', 'নার্সিং নিয়োগ পরীক্ষার প্রশ্ন', 'বিগত বছরের প্রশ্ন', 'BPSC senior staff nurse question', 'DGNM question solution'],
  alternates: { canonical: '/question-solution' },
  openGraph: { title: 'সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান · Nursing Career BD', url: '/question-solution', type: 'article', images: ['/og.jpg'] },
};

export default async function QuestionSolutionIndex() {
  const papers = await listPapers();
  const years = [...new Set(papers.map((p) => p.year))];

  return (
    <Article>
      <Crumbs items={[['/', 'হোম'], ['/question-solution', 'প্রশ্ন সমাধান']]} />
      <Hero title="সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান (২০১৬–২০২৬)"
        sub={`সরকারি নার্সিং নিয়োগ পরীক্ষার আসল প্রশ্ন, সঠিক উত্তরসহ — ${bn(papers.length)}টি পরীক্ষা, সাল অনুযায়ী সাজানো। প্রতিটি পরীক্ষা টাইমারসহ আসল পরীক্ষার মতো দিতেও পারবেন।`}
        updated="নভেম্বর ২০২৬" />

      {years.map((y) => (
        <Section key={y} title={`${bn(y)} সালের পরীক্ষা`}>
          <ul className="space-y-2">
            {papers.filter((p) => p.year === y).map((p) => (
              <li key={p.slug}>
                <Link href={`/question-solution/${p.slug}`} className="flex items-start gap-3 rounded-xl border border-brand-100 bg-white p-3 hover:bg-brand-50">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0">
                    <b className="block text-ink">{paperTitle(p)}</b>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                      <CalendarDays className="h-3.5 w-3.5" />{p.exam_date ? bnExamDate(p.exam_date) : bn(p.year)} · {bn(p.total)}টি প্রশ্ন
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Cta title="আসল পরীক্ষার মতো অনুশীলন করুন" sub="টাইমার, নেগেটিভ মার্কিং ও ফলাফল বিশ্লেষণসহ বিগত বছরের প্রশ্ন পরীক্ষা মোডে দিন।" />
      <Faq items={[
        ['সিনিয়র স্টাফ নার্স পরীক্ষায় কত নম্বরের MCQ হয়?', 'পিএসসির সিনিয়র স্টাফ নার্স নিয়োগে সাধারণত ১০০ নম্বরের MCQ পরীক্ষা হয়, সময় ১ ঘণ্টা; প্রতিটি ভুল উত্তরে ০.৫ নম্বর কাটা যায়।'],
        ['কোন বিষয় থেকে প্রশ্ন আসে?', 'বাংলা, ইংরেজি, সাধারণ জ্ঞান এবং নার্সিং বিষয় (অ্যানাটমি, মেডিসিন-সার্জারি, মিডওয়াইফারি, কমিউনিটি হেলথ ইত্যাদি) থেকে।'],
        ['বিগত বছরের প্রশ্ন পড়ে কি লাভ?', 'অনেক প্রশ্ন বিভিন্ন বছরে ঘুরে ঘুরে আসে, তাই বিগত প্রশ্ন সমাধান করা প্রস্তুতির সবচেয়ে কার্যকর উপায়গুলোর একটি।'],
      ]} />
      <GuideLinks />
    </Article>
  );
}
