import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AppShell } from '@/components/AppShell';

// Noto Sans Bengali: clear, standard-shaped Bangla digits (Hind Siliguri's ১, ৭ were hard to read on phones)
const bnFont = Noto_Sans_Bengali({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-bn', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Nursing Career BD', template: '%s · Nursing Career BD' },
  description: 'Smart Preparation for Nursing Jobs in Bangladesh — বাংলাদেশে নার্সিং চাকরির স্মার্ট প্রস্তুতি',
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
