import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'প্রশ্নব্যাংক — নার্সিং MCQ ব্যাখ্যাসহ',
  description: 'সিনিয়র স্টাফ নার্স ও নার্সিং নিয়োগ পরীক্ষার ১০,০০০+ MCQ প্রশ্ন ব্যাখ্যাসহ। বিষয়, টপিক ও কঠিনতা অনুযায়ী খুঁজুন ও অনুশীলন করুন।',
  alternates: { canonical: '/question-bank' },
  openGraph: { title: 'প্রশ্নব্যাংক — নার্সিং MCQ ব্যাখ্যাসহ · Nursing Career BD', description: 'সিনিয়র স্টাফ নার্স ও নার্সিং নিয়োগ পরীক্ষার ১০,০০০+ MCQ প্রশ্ন ব্যাখ্যাসহ। বিষয়, টপিক ও কঠিনতা অনুযায়ী খুঁজুন ও অনুশীলন করুন।', url: '/question-bank', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
