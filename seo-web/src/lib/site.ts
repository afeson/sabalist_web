// Single source of truth for host + global SEO config.
// Canonical host decision (audit §2): www.sabalist.com.
export const SITE = {
  name: 'Sabalist',
  url: 'https://www.sabalist.com',
  description:
    "Sabalist is Africa's marketplace. Buy and sell electronics, vehicles, real estate, phones, fashion, jobs and more — browse listings near you.",
  twitter: '@sabalist',
  defaultOgImage: 'https://www.sabalist.com/og/default-1200x630.png',
  locale: 'en',
} as const;

// Quality gate (locked decision): a category/location page is only indexed +
// sitemapped once it has at least this many live listings. Below the threshold
// the page still renders for users but emits robots:noindex,follow.
export const INDEX_MIN_LISTINGS = 3;

export function canonical(path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  return `${SITE.url}${clean}`;
}
