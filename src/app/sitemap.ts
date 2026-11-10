import type { MetadataRoute } from 'next';

const BASE = 'https://nursingjob.online';
const PAGES: [path: string, priority: number][] = [
  ['/', 1], ['/question-bank', 0.9], ['/mock-tests', 0.9], ['/subject-practice', 0.8], ['/previous-questions', 0.8],
  ['/premium', 0.8], ['/contact', 0.4], ['/terms', 0.3], ['/privacy', 0.3], ['/refund', 0.3],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map(([path, priority]) => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly', priority }));
}
