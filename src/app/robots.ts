import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/exam/', '/result/', '/payment/', '/profile', '/dashboard'] }],
    sitemap: 'https://nursingjob.online/sitemap.xml',
    host: 'https://nursingjob.online',
  };
}
