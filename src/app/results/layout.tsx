import type { Metadata } from 'next';

// A personal page (needs login): kept out of search results.
export const metadata: Metadata = { title: 'আমার ফলাফল', robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
