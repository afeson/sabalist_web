// GET /api/search — Sabalist's stable public search API.
// The website and mobile apps call THIS, never a search vendor directly, so the
// engine underneath (Firestore fallback today, Meilisearch at scale) can change
// with zero client updates.
//
//   /api/search?q=restaurant&country=Nigeria&city=Lagos&category=food&page=1&perPage=20
//   /api/search?q=chic&mode=autocomplete
//   /api/search?country=Kenya&category=education            (filters-only browse)
//   /api/search?q=hotel&lat=6.45&lng=3.39&radiusKm=10       (geo — engine providers)
//
// Responses are CDN-cached (s-maxage) so repeated queries cost nothing.
import { NextRequest, NextResponse } from 'next/server';
import { runSearch } from '../../../lib/search';

export const dynamic = 'force-dynamic';

function num(v: string | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = (p.get('q') || '').slice(0, 120);
  const mode = p.get('mode') === 'autocomplete' ? 'autocomplete' as const : 'search' as const;

  const result = await runSearch({
    q,
    mode,
    country: p.get('country') || undefined,
    city: p.get('city') || undefined,
    category: p.get('category') || undefined,
    subcategory: p.get('subcategory') || undefined,
    page: num(p.get('page')),
    perPage: num(p.get('perPage')),
    lat: num(p.get('lat')),
    lng: num(p.get('lng')),
    radiusKm: num(p.get('radiusKm')),
  });

  return NextResponse.json(result, {
    headers: {
      // Cache identical queries at the edge: 5 min fresh + 1 h stale-while-revalidate.
      // This is the main cost control for the Firestore fallback provider.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*', // mobile apps + SPA call cross-origin
    },
  });
}
