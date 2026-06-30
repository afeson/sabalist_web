import { SITE, INDEX_MIN_LISTINGS } from '@/lib/site';
import { COUNTRIES } from '@/lib/locations';
import { CATEGORIES } from '@/lib/taxonomy';
import { countListingsByCity } from '@/lib/listings';
import { urlset, XML_HEADERS } from '@/lib/xml';
export const revalidate = 3600;
export async function GET() {
  const urls: { loc: string; changefreq: string; priority: string }[] = [];
  for (const co of COUNTRIES) {
    urls.push({ loc: `${SITE.url}/${co.slug}`, changefreq: 'weekly', priority: '0.6' });
    for (const ci of co.cities) {
      let n = 0; try { n = await countListingsByCity(co, ci); } catch {}
      if (n >= INDEX_MIN_LISTINGS) {
        urls.push({ loc: `${SITE.url}/${co.slug}/${ci.slug}`, changefreq: 'daily', priority: '0.7' });
        for (const c of CATEGORIES) {
          let cn = 0; try { cn = await countListingsByCity(co, ci, c.id); } catch {}
          if (cn >= INDEX_MIN_LISTINGS) urls.push({ loc: `${SITE.url}/${co.slug}/${ci.slug}/${c.id}`, changefreq: 'daily', priority: '0.6' });
        }
      }
    }
  }
  return new Response(urlset(urls), { headers: XML_HEADERS });
}
