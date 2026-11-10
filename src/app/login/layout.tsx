import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'লগইন',
  description: 'Nursing Career BD অ্যাকাউন্টে লগইন করুন।',
  alternates: { canonical: '/login' },
  openGraph: { title: 'লগইন · Nursing Career BD', description: 'Nursing Career BD অ্যাকাউন্টে লগইন করুন।', url: '/login', images: ['/og.jpg'] },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
