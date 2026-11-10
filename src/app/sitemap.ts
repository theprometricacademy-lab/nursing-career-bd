import type { MetadataRoute } from 'next';
import { SEO_SUBJECTS } from '@/lib/seoSubjects';

const BASE = 'https://nursingjob.online';
const PAGES: [path: string, priority: number][] = [
  ['/', 1], ['/senior-staff-nurse', 0.95], ['/nursing-job-preparation', 0.9], ['/nursing-mcq', 0.9],
  ['/question-bank', 0.9], ['/mock-tests', 0.9], ['/subject-practice', 0.8], ['/previous-questions', 0.8],
  ['/premium', 0.8], ['/contact', 0.4], ['/terms', 0.3], ['/privacy', 0.3], ['/refund', 0.3],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...PAGES.map(([path, priority]) => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly' as const, priority })),
    ...SEO_SUBJECTS.map((s) => ({ url: `${BASE}/mcq/${s.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: s.nursing ? 0.8 : 0.7 })),
  ];
}
