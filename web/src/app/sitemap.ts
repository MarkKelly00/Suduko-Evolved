import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    { url: '/', priority: 1.0, changeFrequency: 'weekly' as const },
    { url: '/leaderboards', priority: 0.7, changeFrequency: 'hourly' as const },
    { url: '/download', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/support', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
    { url: '/terms', priority: 0.4, changeFrequency: 'yearly' as const },
    { url: '/delete-account', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  return staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.url}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
