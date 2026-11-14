import type { Metadata } from 'next';

// A personal page (needs login): kept out of search results.
export const metadata: Metadata = { title: 'বুকমার্ক করা প্রশ্ন', robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
