import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'রিফান্ড নীতি',
  description: 'Nursing Career BD-এর প্রিমিয়াম প্যাকেজের টাকা ফেরতের নিয়ম।',
  alternates: { canonical: '/refund' },
  openGraph: { title: 'রিফান্ড নীতি · Nursing Career BD', description: 'Nursing Career BD-এর প্রিমিয়াম প্যাকেজের টাকা ফেরতের নিয়ম।', url: '/refund', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
