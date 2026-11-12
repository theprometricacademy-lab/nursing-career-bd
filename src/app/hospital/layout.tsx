import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'হাসপাতালের জন্য — ফ্রিতে নার্স নিয়োগ বিজ্ঞপ্তি দিন',
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
