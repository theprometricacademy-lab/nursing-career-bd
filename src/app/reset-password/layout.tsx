import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'নতুন পাসওয়ার্ড',
  description: 'নতুন পাসওয়ার্ড দিন।',
  alternates: { canonical: '/reset-password' },
  openGraph: { title: 'নতুন পাসওয়ার্ড · Nursing Career BD', description: 'নতুন পাসওয়ার্ড দিন।', url: '/reset-password', images: ['/og.jpg'] },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
