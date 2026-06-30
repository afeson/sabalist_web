import { SITE } from '@/lib/site';
import { getAllActiveListingIds } from '@/lib/listings';
import { urlset, XML_HEADERS } from '@/lib/xml';
export const revalidate = 3600;
const PER = 45000;
export async function GET(_req: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const p = Math.max(0, parseInt(page, 10) || 0);
  let all: { id: string; lastmod?: string }[] = [];
  try { all = await getAllActiveListingIds(); } catch {}
  const slice = all.slice(p * PER, (p + 1) * PER);
  const urls = slice.map((l) => ({ loc: `${SITE.url}/listing/${l.id}`, lastmod: l.lastmod, changefreq: 'weekly', priority: '0.7' }));
  return new Response(urlset(urls), { headers: XML_HEADERS });
}
