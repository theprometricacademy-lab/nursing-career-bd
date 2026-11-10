import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'বিষয়ভিত্তিক অনুশীলন — নার্সিং ও সাধারণ বিষয়',
  description: 'ফান্ডামেন্টালস, মেডিকেল-সার্জিক্যাল, ফার্মাকোলজি, মাতৃ ও শিশু স্বাস্থ্যসহ নার্সিং এবং বাংলা, ইংরেজি, সাধারণ জ্ঞান বিষয়ে আলাদা অনুশীলন।',
  alternates: { canonical: '/subject-practice' },
  openGraph: { title: 'বিষয়ভিত্তিক অনুশীলন — নার্সিং ও সাধারণ বিষয় · Nursing Career BD', description: 'ফান্ডামেন্টালস, মেডিকেল-সার্জিক্যাল, ফার্মাকোলজি, মাতৃ ও শিশু স্বাস্থ্যসহ নার্সিং এবং বাংলা, ইংরেজি, সাধারণ জ্ঞান বিষয়ে আলাদা অনুশীলন।', url: '/subject-practice', images: ['/og.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
