import { SITE } from '@/lib/site';
import { getAllActiveListingsForImages } from '@/lib/listings';
import { urlset, XML_HEADERS } from '@/lib/xml';
export const revalidate = 7200;
const PER = 20000;
export async function GET(_req: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const p = Math.max(0, parseInt(page, 10) || 0);
  let all = [] as Awaited<ReturnType<typeof getAllActiveListingsForImages>>;
  try { all = await getAllActiveListingsForImages(); } catch {}
  const slice = all.slice(p * PER, (p + 1) * PER);
  const urls = slice.map((l) => ({
    loc: `${SITE.url}/listing/${l.id}`,
    images: [l.coverImage, ...(l.images || [])].filter(Boolean).slice(0, 10).map((src) => ({ loc: src as string, caption: l.title })),
  }));
  return new Response(urlset(urls), { headers: XML_HEADERS });
}
