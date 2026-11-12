import type { MetadataRoute } from 'next';
import { SEO_SUBJECTS } from '@/lib/seoSubjects';
import { fetchCirculars } from '@/lib/circulars';
import { listPapers } from '@/lib/examPapers';
import { listWritten } from '@/lib/writtenPapers';
import { fetchJobs, openJobsQuery } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

const BASE = 'https://nursingcareerbd.com';
const PAGES: [path: string, priority: number][] = [
  ['/', 1], ['/question-solution', 0.95], ['/written-questions', 0.85], ['/circulars', 0.95], ['/senior-staff-nurse', 0.95], ['/nursing-job-preparation', 0.9], ['/nursing-mcq', 0.9],
  ['/question-bank', 0.9], ['/mock-tests', 0.9], ['/leaderboard', 0.7], ['/weekly-test', 0.85], ['/jobs', 0.9], ['/subject-practice', 0.8], ['/previous-questions', 0.8],
  ['/premium', 0.8], ['/contact', 0.4], ['/terms', 0.3], ['/privacy', 0.3], ['/refund', 0.3],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [circulars, papers, written, jobs] = await Promise.all([fetchCirculars('select=slug,updated_at,apply_end&limit=500'), listPapers(), listWritten(), fetchJobs(openJobsQuery())]);
  return [
    ...PAGES.map(([path, priority]) => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly' as const, priority })),
    ...circulars.map((c) => ({
      url: `${BASE}/circulars/${c.slug}`, lastModified: new Date(c.updated_at), changeFrequency: 'daily' as const,
      priority: c.apply_end && new Date(c.apply_end).getTime() > now.getTime() ? 0.9 : 0.5,
    })),
    ...papers.map((p) => ({ url: `${BASE}/question-solution/${p.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 })),
    ...written.map((p) => ({ url: `${BASE}/written-questions/${p.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 })),
    ...jobs.map((j) => ({ url: `${BASE}/jobs/${j.slug}`, lastModified: new Date(j.updated_at), changeFrequency: 'daily' as const, priority: 0.85 })),
    ...SEO_SUBJECTS.map((s) => ({ url: `${BASE}/mcq/${s.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: s.nursing ? 0.8 : 0.7 })),
  ];
}
