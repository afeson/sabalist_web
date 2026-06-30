import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { COUNTRIES } from '@/lib/locations';
import { getCategory } from '@/lib/taxonomy';
import { SITE } from '@/lib/site';
import { pingIndexNow } from '@/lib/indexnow';

export const runtime = 'nodejs';

/**
 * On-demand revalidation. Call when a listing is created / edited / sold /
 * deleted so its page (and the category/location pages that list it) refresh
 * immediately instead of waiting for the ISR window.
 *
 * Auth: send the shared secret as `x-revalidate-secret` header OR `?secret=`.
 * Set REVALIDATE_SECRET in the Vercel project env.
 *
 * POST body (all optional except id for a listing event):
 *   {
 *     "type": "listing",          // "listing" | "category" | "city"
 *     "id": "<firestoreId>",
 *     "categoryId": "vehicles",
 *     "subcategory": "cars",
 *     "location": "Lagos, Nigeria"
 *   }
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false; // fail closed if unconfigured
  const provided = req.headers.get('x-revalidate-secret') || req.nextUrl.searchParams.get('secret');
  return provided === secret;
}

// Map a free-text location to the city/country pages that include it.
function citiesFor(location?: string): { country: string; city: string }[] {
  if (!location) return [];
  const loc = location.toLowerCase();
  const hits: { country: string; city: string }[] = [];
  for (const co of COUNTRIES) {
    for (const ci of co.cities) {
      if (ci.matchTerms.some((t) => loc.includes(t.toLowerCase()))) hits.push({ country: co.slug, city: ci.slug });
    }
  }
  return hits;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { type = 'listing', id, categoryId, subcategory, location } = body;
  const revalidated: string[] = [];
  const touch = (p: string) => { revalidatePath(p); revalidated.push(p); };

  if (type === 'listing' && id) touch(`/listing/${id}`);

  if (categoryId && getCategory(categoryId)) {
    touch(`/category/${categoryId}`);
    if (subcategory) touch(`/category/${categoryId}/${subcategory}`);
  }

  for (const { country, city } of citiesFor(location)) {
    touch(`/${country}`);
    touch(`/${country}/${city}`);
    if (categoryId) touch(`/${country}/${city}/${categoryId}`);
  }

  // Home (recent grid) + sitemaps so new/removed URLs are reflected.
  touch('/');
  touch('/sitemap.xml');
  touch('/sitemap-index.xml');
  touch('/sitemaps/listings/0');
  touch('/sitemaps/images/0');

  // Instantly notify IndexNow-compatible engines (Bing/Yandex) for the
  // content URLs we just changed (skip sitemap/internal paths).
  const indexNowUrls = revalidated.filter((p) => !p.startsWith('/sitemap')).map((p) => `${SITE.url}${p === '/' ? '' : p}`);
  await pingIndexNow(indexNowUrls);

  return NextResponse.json({ ok: true, revalidated, at: new Date().toISOString() });
}

// Lightweight health check (no secret needed; reveals nothing sensitive).
export async function GET() {
  return NextResponse.json({ ok: true, configured: !!process.env.REVALIDATE_SECRET });
}
