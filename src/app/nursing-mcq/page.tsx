import type { Metadata } from 'next';
import Link from 'next/link';
import { Article, Crumbs, Cta, GuideLinks, Hero, Section } from '@/components/SeoBlocks';
import { McqList } from '@/components/McqList';
import { SEO_SUBJECTS, rpc, type SampleQ } from '@/lib/seoSubjects';

export const dynamic = 'force-dynamic';

const DESC = 'সিনিয়র স্টাফ নার্স ও নার্সিং নিয়োগ পরীক্ষার জন্য বিষয়ভিত্তিক নার্সিং MCQ প্রশ্ন, সঠিক উত্তর ও ব্যাখ্যা। ফান্ডামেন্টালস, মেডিকেল-সার্জিক্যাল, ফার্মাকোলজি, মাতৃ ও শিশু স্বাস্থ্য, বাংলা, ইংরেজি ও সাধারণ জ্ঞান।';

export const metadata: Metadata = {
  title: 'নার্সিং MCQ প্রশ্ন ও উত্তর (ব্যাখ্যাসহ) — বিষয়ভিত্তিক',
  description: DESC,
  keywords: ['নার্সিং MCQ', 'nursing MCQ', 'nursing MCQ question with answer', 'সিনিয়র স্টাফ নার্স প্রশ্ন ও উত্তর', 'নার্সিং প্রশ্ন ও উত্তর', 'nursing question bank bangladesh'],
  alternates: { canonical: '/nursing-mcq' },
  openGraph: { title: 'নার্সিং MCQ প্রশ্ন ও উত্তর (ব্যাখ্যাসহ) · Nursing Career BD', description: DESC, url: '/nursing-mcq', type: 'article', images: ['/og.jpg'] },
};

export default async function NursingMcqPage() {
  const free = (await rpc<SampleQ[]>('public_free_questions', {})) ?? [];
  const nursing = SEO_SUBJECTS.filter((s) => s.nursing);
  const general = SEO_SUBJECTS.filter((s) => !s.nursing);

  return (
    <Article>
      <Crumbs items={[['/', 'হোম'], ['/nursing-mcq', 'নার্সিং MCQ প্রশ্ন ও উত্তর']]} />
      <Hero title="নার্সিং MCQ প্রশ্ন ও উত্তর — ব্যাখ্যাসহ"
        sub="সিনিয়র স্টাফ নার্স ও অন্যান্য নার্সিং নিয়োগ পরীক্ষার ধরনে বিষয়ভিত্তিক বাছাই করা প্রশ্ন। প্রতিটির সঠিক উত্তর ও ব্যাখ্যা দেওয়া আছে। নিচ থেকে বিষয় বেছে নিন।"
        updated="নভেম্বর ২০২৬" />

      <Section title="নার্সিং বিষয়ের MCQ">
        <div className="grid gap-2 sm:grid-cols-2">
          {nursing.map((s) => (
            <Link key={s.slug} href={`/mcq/${s.slug}`} className="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2.5 text-ink hover:bg-brand-50">
              <span><b>{s.bn}</b> <span className="text-xs text-ink-soft">({s.en})</span></span><span className="text-brand-600">→</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="বাংলা, ইংরেজি ও সাধারণ জ্ঞানের MCQ">
        <div className="grid gap-2 sm:grid-cols-2">
          {general.map((s) => (
            <Link key={s.slug} href={`/mcq/${s.slug}`} className="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2.5 text-ink hover:bg-brand-50">
              <span><b>{s.bn}</b> <span className="text-xs text-ink-soft">({s.en})</span></span><span className="text-brand-600">→</span>
            </Link>
          ))}
        </div>
      </Section>

      {free.length > 0 && (
        <Section title="ফ্রি নমুনা প্রশ্ন">
          <McqList items={free.slice(0, 20)} />
        </Section>
      )}

      <Cta title="১১,০০০+ প্রশ্নে অনুশীলন করুন" sub="বিষয়, টপিক ও কঠিনতা অনুযায়ী প্রশ্নব্যাংক এবং PSC প্যাটার্নে পূর্ণাঙ্গ মডেল টেস্ট।" />
      <GuideLinks current="/nursing-mcq" />
    </Article>
  );
}
