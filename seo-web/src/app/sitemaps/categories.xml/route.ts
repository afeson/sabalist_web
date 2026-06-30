import { SITE, INDEX_MIN_LISTINGS } from '@/lib/site';
import { CATEGORIES } from '@/lib/taxonomy';
import { getListingsByCategory, getListingsBySubcategory } from '@/lib/listings';
import { urlset, XML_HEADERS } from '@/lib/xml';
export const revalidate = 3600;
export async function GET() {
  const urls: { loc: string; changefreq: string; priority: string }[] = [];
  for (const c of CATEGORIES) {
    urls.push({ loc: `${SITE.url}/category/${c.id}`, changefreq: 'daily', priority: '0.8' });
    for (const s of c.subCategories) {
      let n = 0; try { n = (await getListingsBySubcategory(c.id, s.id, 1000)).length; } catch {}
      if (n >= INDEX_MIN_LISTINGS) urls.push({ loc: `${SITE.url}/category/${c.id}/${s.id}`, changefreq: 'daily', priority: '0.6' });
    }
  }
  return new Response(urlset(urls), { headers: XML_HEADERS });
}
