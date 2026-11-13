import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { AppProvider, HydrationMark } from '@/components/AppProvider';
import { MetaPixel } from '@/components/MetaPixel';
import { AppShell } from '@/components/AppShell';
import { Tracker } from '@/components/Tracker';

// Noto Sans Bengali: clear, standard-shaped Bangla digits (Hind Siliguri's ১, ৭ were hard to read on phones)
const bnFont = Noto_Sans_Bengali({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-bn', display: 'swap' });

const DESC = 'সিনিয়র স্টাফ নার্স ও সরকারি নার্সিং চাকরির প্রস্তুতি: ১০,০০০+ প্রশ্নব্যাংক, PSC প্যাটার্নে মডেল টেস্ট, বিষয়ভিত্তিক অনুশীলন ও ফলাফল বিশ্লেষণ।';
export const metadata: Metadata = {
  metadataBase: new URL('https://nursingcareerbd.com'),
  title: { default: 'Nursing Career BD — নার্সিং চাকরির প্রস্তুতি', template: '%s · Nursing Career BD' },
  description: DESC,
  keywords: ['সিনিয়র স্টাফ নার্স', 'নার্সিং চাকরি', 'Senior Staff Nurse', 'PSC nursing exam', 'nursing MCQ', 'মডেল টেস্ট', 'Bangladesh nursing job'],
  openGraph: {
    type: 'website', url: 'https://nursingcareerbd.com', siteName: 'Nursing Career BD', locale: 'bn_BD',
    title: 'Nursing Career BD — নার্সিং চাকরির স্মার্ট প্রস্তুতি', description: DESC,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Nursing Career BD — নার্সিং চাকরির স্মার্ট প্রস্তুতি' }],
  },
  twitter: { card: 'summary_large_image', title: 'Nursing Career BD', description: DESC, images: ['/og.jpg'] },
  category: 'education',
  appleWebApp: { capable: true, title: 'Nursing Career BD', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#1f7ad6', width: 'device-width', initialScale: 1, maximumScale: 1 };

// Structured data so Google shows the site name and understands it is an education service
const SITE_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization', '@id': 'https://nursingcareerbd.com/#org', name: 'Nursing Career BD',
      url: 'https://nursingcareerbd.com', logo: 'https://nursingcareerbd.com/icon.svg', image: 'https://nursingcareerbd.com/og.jpg',
      description: DESC, areaServed: 'BD',
      sameAs: ['https://www.facebook.com/share/1Ej43zxCY7/'], email: 'nursingcareerbd@gmail.com',
      contactPoint: { '@type': 'ContactPoint', telephone: '+8801710921994', email: 'nursingcareerbd@gmail.com', contactType: 'customer support', availableLanguage: ['Bengali', 'English'] },
    },
    { '@type': 'WebSite', '@id': 'https://nursingcareerbd.com/#website', url: 'https://nursingcareerbd.com', name: 'Nursing Career BD', inLanguage: 'bn-BD', publisher: { '@id': 'https://nursingcareerbd.com/#org' } },
  ],
};

// No cookies()/headers() here: that would make every page server-rendered on each click.
// Pages are static and prefetched, so moving between them is instant; the saved language is applied in the browser.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={bnFont.variable} suppressHydrationWarning>
      <head>
        {/* apply the saved light/dark choice before the first paint (no white flash); keep an early app-install prompt */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e});" }} />
      </head>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
        <AppProvider initialLang="bn">
          <Suspense fallback={null}><Tracker /></Suspense>
          <MetaPixel />
          <AppShell><Suspense fallback={null}>{children}<HydrationMark /></Suspense></AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
