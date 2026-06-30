import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Allows public content + AI search agents; blocks app/private + debug pages.
export default function robots(): MetadataRoute.Robots {
  const aiAgents = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Amazonbot', 'Bingbot', 'Applebot-Extended'];
  const disallow = ['/app/', '/favorites', '/my-listings', '/profile', '/edit-profile', '/create', '/auth', '/notifications', '/*.html$'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiAgents.map((ua) => ({ userAgent: ua, allow: '/' })),
    ],
    sitemap: `${SITE.url}/sitemap-index.xml`,
    host: SITE.url,
  };
}
