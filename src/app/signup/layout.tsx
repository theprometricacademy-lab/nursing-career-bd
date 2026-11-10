import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ফ্রি অ্যাকাউন্ট খুলুন',
  description: 'ফ্রি অ্যাকাউন্ট খুলে নার্সিং চাকরির প্রস্তুতি শুরু করুন।',
  alternates: { canonical: '/signup' },
  openGraph: { title: 'ফ্রি অ্যাকাউন্ট খুলুন · Nursing Career BD', description: 'ফ্রি অ্যাকাউন্ট খুলে নার্সিং চাকরির প্রস্তুতি শুরু করুন।', url: '/signup', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
