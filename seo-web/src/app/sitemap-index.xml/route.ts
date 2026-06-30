import { SITE } from '@/lib/site';
import { getAllActiveListingIds } from '@/lib/listings';
export const revalidate = 3600;
const PER = 45000;
const IMG_PER = 20000;
// Canonical sitemap index referenced by robots.txt. Point Search Console here.
export async function GET() {
  let listingPages = 1, imagePages = 1;
  try {
    const n = (await getAllActiveListingIds()).length;
    listingPages = Math.max(1, Math.ceil(n / PER));
    imagePages = Math.max(1, Math.ceil(n / IMG_PER));
  } catch {}
  const children = [
    `${SITE.url}/sitemaps/categories.xml`,
    `${SITE.url}/sitemaps/locations.xml`,
    ...Array.from({ length: listingPages }, (_, i) => `${SITE.url}/sitemaps/listings/${i}`),
    ...Array.from({ length: imagePages }, (_, i) => `${SITE.url}/sitemaps/images/${i}`),
  ];
  const body = children.map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
}
