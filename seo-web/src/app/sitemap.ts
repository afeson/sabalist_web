import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { CATEGORIES } from '@/lib/taxonomy';
import { COUNTRIES } from '@/lib/locations';
import { GUIDES } from '@/lib/guides';

// /sitemap.xml — the small "hub" sitemap (static + category + country + guides).
// The FULL segmented index (incl. listings + images) is /sitemap-index.xml,
// which robots.txt points search engines to.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    ...GUIDES.map((g) => ({ url: `${SITE.url}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...CATEGORIES.map((c) => ({ url: `${SITE.url}/category/${c.id}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...COUNTRIES.map((c) => ({ url: `${SITE.url}/${c.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
