import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'পাসওয়ার্ড ভুলে গেছেন',
  description: 'পাসওয়ার্ড রিসেট করুন।',
  alternates: { canonical: '/forgot-password' },
  openGraph: { title: 'পাসওয়ার্ড ভুলে গেছেন · Nursing Career BD', description: 'পাসওয়ার্ড রিসেট করুন।', url: '/forgot-password', images: ['/og.jpg'] },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
