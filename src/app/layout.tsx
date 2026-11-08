import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AppShell } from '@/components/AppShell';
import type { Lang } from '@/lib/i18n';

const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-hind' });

export const metadata: Metadata = {
  title: { default: 'Nursing Career BD', template: '%s · Nursing Career BD' },
  description: 'Smart Preparation for Nursing Jobs in Bangladesh — বাংলাদেশে নার্সিং চাকরির স্মার্ট প্রস্তুতি',
  appleWebApp: { capable: true, title: 'Nursing Career BD', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#1f7ad6', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const lang: Lang = c.get('lang')?.value === 'en' ? 'en' : 'bn';
  return (
    <html lang={lang} className={hind.variable}>
      <body className="font-sans antialiased">
        <AppProvider initialLang={lang}>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
