import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'শর্তাবলি',
  description: 'Nursing Career BD ব্যবহারের শর্তাবলি।',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'শর্তাবলি · Nursing Career BD', description: 'Nursing Career BD ব্যবহারের শর্তাবলি।', url: '/terms', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
