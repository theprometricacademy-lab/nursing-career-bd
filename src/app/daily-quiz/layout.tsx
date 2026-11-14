import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ডেইলি কুইজ — নার্সিং MCQ অনুশীলন',
  description: 'নার্সিং নিয়োগ পরীক্ষার প্রস্তুতির জন্য ছোট কুইজ দিয়ে নিয়মিত অনুশীলন করুন।',
  alternates: { canonical: '/daily-quiz' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
