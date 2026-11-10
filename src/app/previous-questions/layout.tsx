import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'বিগত বছরের প্রশ্ন — সিনিয়র স্টাফ নার্স',
  description: 'সিনিয়র স্টাফ নার্স ও অন্যান্য নার্সিং নিয়োগ পরীক্ষার বিগত বছরের প্রশ্ন, সাল ও পরীক্ষা অনুযায়ী।',
  alternates: { canonical: '/previous-questions' },
  openGraph: { title: 'বিগত বছরের প্রশ্ন — সিনিয়র স্টাফ নার্স · Nursing Career BD', description: 'সিনিয়র স্টাফ নার্স ও অন্যান্য নার্সিং নিয়োগ পরীক্ষার বিগত বছরের প্রশ্ন, সাল ও পরীক্ষা অনুযায়ী।', url: '/previous-questions', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
