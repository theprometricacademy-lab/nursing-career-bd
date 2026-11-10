import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AppShell } from '@/components/AppShell';

// Noto Sans Bengali: clear, standard-shaped Bangla digits (Hind Siliguri's ১, ৭ were hard to read on phones)
const bnFont = Noto_Sans_Bengali({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-bn', display: 'swap' });

const DESC = 'সিনিয়র স্টাফ নার্স ও সরকারি নার্সিং চাকরির প্রস্তুতি: ১০,০০০+ প্রশ্নব্যাংক, PSC প্যাটার্নে মডেল টেস্ট, বিষয়ভিত্তিক অনুশীলন ও ফলাফল বিশ্লেষণ।';
export const metadata: Metadata = {
  metadataBase: new URL('https://nursingjob.online'),
  title: { default: 'Nursing Career BD — নার্সিং চাকরির প্রস্তুতি', template: '%s · Nursing Career BD' },
  description: DESC,
  keywords: ['সিনিয়র স্টাফ নার্স', 'নার্সিং চাকরি', 'Senior Staff Nurse', 'PSC nursing exam', 'nursing MCQ', 'মডেল টেস্ট', 'Bangladesh nursing job'],
  openGraph: { type: 'website', url: 'https://nursingjob.online', siteName: 'Nursing Career BD', locale: 'bn_BD', title: 'Nursing Career BD — নার্সিং চাকরির স্মার্ট প্রস্তুতি', description: DESC },
  twitter: { card: 'summary', title: 'Nursing Career BD', description: DESC },
  appleWebApp: { capable: true, title: 'Nursing Career BD', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#1f7ad6', width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover' };

// No cookies()/headers() here: that would make every page server-rendered on each click.
// Pages are static and prefetched, so moving between them is instant; the saved language is applied in the browser.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={bnFont.variable}>
      <body className="font-sans antialiased">
        <AppProvider initialLang="bn">
          <AppShell><Suspense fallback={null}>{children}</Suspense></AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
