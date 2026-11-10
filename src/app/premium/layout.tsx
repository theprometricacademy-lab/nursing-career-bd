import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'প্রিমিয়াম প্যাকেজ',
  description: 'সব প্রিমিয়াম প্রশ্ন, পূর্ণ মডেল টেস্ট ও বিস্তারিত ফলাফল বিশ্লেষণ একবারের পেমেন্টে। bKash/Nagad-এ পেমেন্ট।',
  alternates: { canonical: '/premium' },
  openGraph: { title: 'প্রিমিয়াম প্যাকেজ · Nursing Career BD', description: 'সব প্রিমিয়াম প্রশ্ন, পূর্ণ মডেল টেস্ট ও বিস্তারিত ফলাফল বিশ্লেষণ একবারের পেমেন্টে। bKash/Nagad-এ পেমেন্ট।', url: '/premium', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
