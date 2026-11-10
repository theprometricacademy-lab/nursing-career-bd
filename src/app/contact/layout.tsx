import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'যোগাযোগ',
  description: 'Nursing Career BD-এর সাথে যোগাযোগ: পেমেন্ট, অ্যাকাউন্ট বা প্রশ্ন সংক্রান্ত সহায়তা।',
  alternates: { canonical: '/contact' },
  openGraph: { title: 'যোগাযোগ · Nursing Career BD', description: 'Nursing Career BD-এর সাথে যোগাযোগ: পেমেন্ট, অ্যাকাউন্ট বা প্রশ্ন সংক্রান্ত সহায়তা।', url: '/contact', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
