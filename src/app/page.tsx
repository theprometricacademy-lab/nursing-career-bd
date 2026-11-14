import type { Metadata } from 'next';
import HomePage from './HomeClient';

// The home page is also opened with ?utm_source=… from ads: the canonical tells Google these are one page.
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Page() {
  return <HomePage />;
}
