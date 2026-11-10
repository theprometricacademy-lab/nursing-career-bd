import type { MetadataRoute } from 'next';
import { SEO_SUBJECTS } from '@/lib/seoSubjects';
import { fetchCirculars } from '@/lib/circulars';

export const dynamic = 'force-dynamic';

const BASE = 'https://nursingjob.online';
const PAGES: [path: string, priority: number][] = [
  ['/', 1], ['/circulars', 0.95], ['/senior-staff-nurse', 0.95], ['/nursing-job-preparation', 0.9], ['/nursing-mcq', 0.9],
  ['/question-bank', 0.9], ['/mock-tests', 0.9], ['/leaderboard', 0.7], ['/subject-practice', 0.8], ['/previous-questions', 0.8],
  ['/premium', 0.8], ['/contact', 0.4], ['/terms', 0.3], ['/privacy', 0.3], ['/refund', 0.3],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const circulars = await fetchCirculars('select=slug,updated_at,apply_end&limit=500');
  return [
    ...PAGES.map(([path, priority]) => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly' as const, priority })),
    ...circulars.map((c) => ({
      url: `${BASE}/circulars/${c.slug}`, lastModified: new Date(c.updated_at), changeFrequency: 'daily' as const,
      priority: c.apply_end && new Date(c.apply_end).getTime() > now.getTime() ? 0.9 : 0.5,
    })),
    ...SEO_SUBJECTS.map((s) => ({ url: `${BASE}/mcq/${s.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: s.nursing ? 0.8 : 0.7 })),
  ];
}
