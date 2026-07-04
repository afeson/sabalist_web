// Single source of truth for host + global SEO config.
// Canonical host decision (audit §2): www.sabalist.com.
export const SITE = {
  name: 'Sabalist',
  url: 'https://www.sabalist.com',
  description:
    "Sabalist is Africa's business directory and classified marketplace. Find African businesses — restaurants, hotels, hospitals, schools, banks and shops — and buy & sell electronics, vehicles, real estate, phones, fashion and jobs.",
  twitter: '@sabalist',
  defaultOgImage: 'https://www.sabalist.com/og/default-1200x630.png',
  locale: 'en',
  // Interactive Expo SPA (login/post/chat) lives on its own subdomain.
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.sabalist.com',
} as const;

// Quality gate (locked decision): a category/location page is only indexed +
// sitemapped once it has at least this many live listings. Below the threshold
// the page still renders for users but emits robots:noindex,follow.
export const INDEX_MIN_LISTINGS = 3;

export function canonical(path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  return `${SITE.url}${clean}`;
}
