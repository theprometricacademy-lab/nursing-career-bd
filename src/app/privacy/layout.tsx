import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'গোপনীয়তা নীতি',
  description: 'Nursing Career BD কোন তথ্য সংগ্রহ করে ও কীভাবে ব্যবহার করে।',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'গোপনীয়তা নীতি · Nursing Career BD', description: 'Nursing Career BD কোন তথ্য সংগ্রহ করে ও কীভাবে ব্যবহার করে।', url: '/privacy', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
