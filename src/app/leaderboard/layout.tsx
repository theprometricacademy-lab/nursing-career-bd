import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'সাপ্তাহিক মেধাতালিকা — সিনিয়র স্টাফ নার্স মডেল টেস্ট',
  description: 'প্রিমিয়াম মডেল টেস্ট সিরিজে প্রতি সপ্তাহের সেরা ২০ জনের তালিকা। নিজের অবস্থান দেখুন, প্রস্তুতিকে প্রতিযোগিতায় নিয়ে যান।',
  alternates: { canonical: '/leaderboard' },
  openGraph: { title: 'সাপ্তাহিক মেধাতালিকা · Nursing Career BD', url: '/leaderboard', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
