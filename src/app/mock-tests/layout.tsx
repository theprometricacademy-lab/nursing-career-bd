import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'মডেল টেস্ট — PSC প্যাটার্নে নার্সিং পরীক্ষা',
  description: 'PSC সিনিয়র স্টাফ নার্স পরীক্ষার প্যাটার্নে (বাংলা, ইংরেজি, সাধারণ জ্ঞান, নার্সিং) টাইমার ও নেগেটিভ মার্কিংসহ অনলাইন মডেল টেস্ট।',
  alternates: { canonical: '/mock-tests' },
  openGraph: { title: 'মডেল টেস্ট — PSC প্যাটার্নে নার্সিং পরীক্ষা · Nursing Career BD', description: 'PSC সিনিয়র স্টাফ নার্স পরীক্ষার প্যাটার্নে (বাংলা, ইংরেজি, সাধারণ জ্ঞান, নার্সিং) টাইমার ও নেগেটিভ মার্কিংসহ অনলাইন মডেল টেস্ট।', url: '/mock-tests', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
