import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'সাপ্তাহিক ফ্রি মডেল টেস্ট — সিনিয়র স্টাফ নার্স প্রস্তুতি',
  description: 'প্রতি সপ্তাহে নতুন ৫০ প্রশ্নের ফ্রি মডেল টেস্ট। সপ্তাহের যেকোনো সময় পরীক্ষা দিন, শেষে সবার মধ্যে নিজের অবস্থান দেখুন।',
  alternates: { canonical: '/weekly-test' },
  openGraph: { title: 'সাপ্তাহিক ফ্রি মডেল টেস্ট · Nursing Career BD', url: '/weekly-test', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
