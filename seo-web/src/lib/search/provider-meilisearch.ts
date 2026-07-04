// Meilisearch SearchProvider — the durable engine for 10M+ listings.
// Disk-backed (LMDB): the index pages to SSD instead of OOM-crashing, so the
// hard RAM ceiling that killed Typesense at 2.45M does not exist here.
// Env-gated: set MEILISEARCH_URL + MEILISEARCH_SEARCH_KEY and this provider
// takes over; unset, /api/search silently serves from the Firestore fallback.
// Documents are stored WHOLE in Meilisearch (mirrored by ingestion/sync), so
// serving a search costs ZERO Firestore reads.
import type { SearchProvider, SearchRequest, SearchResponse, SearchHit } from './types';

const URL = (process.env.MEILISEARCH_URL || '').replace(/\/$/, '');
const KEY = process.env.MEILISEARCH_SEARCH_KEY || '';
const INDEX = process.env.MEILISEARCH_INDEX || 'listings';

function esc(v: string): string {
  return String(v).replace(/["\\]/g, '');
}

export const meilisearchProvider: SearchProvider = {
  name: 'meilisearch',
  enabled() { return !!(URL && KEY); },

  async search(req: SearchRequest): Promise<SearchResponse | null> {
    if (!this.enabled()) return null;
    const t0 = Date.now();
    const page = Math.max(1, req.page || 1);
    const perPage = req.mode === 'autocomplete' ? 8 : Math.min(50, Math.max(1, req.perPage || 20));

    const filter: string[] = ['status = "active"'];
    if (req.country) filter.push(`country = "${esc(req.country)}"`);
    if (req.city) filter.push(`city = "${esc(req.city)}"`);
    if (req.category) filter.push(`categoryId = "${esc(req.category)}"`);
    if (req.subcategory) filter.push(`subcategory = "${esc(req.subcategory)}"`);
    if (req.lat != null && req.lng != null && req.radiusKm) {
      filter.push(`_geoRadius(${req.lat}, ${req.lng}, ${Math.round(req.radiusKm * 1000)})`);
    }

    const body: any = {
      q: req.q || '',
      filter,
      page,
      hitsPerPage: perPage,
      attributesToRetrieve: ['id', 'title', 'categoryId', 'subcategory', 'city', 'country', 'location', 'latitude', 'longitude', 'quality_score', 'thumbnail'],
    };
    // Geo-aware ranking when coordinates provided; otherwise quality-weighted
    // relevance (index-level ranking rules handle quality_score).
    if (req.lat != null && req.lng != null) body.sort = [`_geoPoint(${req.lat}, ${req.lng}):asc`];

    try {
      const res = await fetch(`${URL}/indexes/${INDEX}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000), // fail fast → Firestore fallback, never hang
        next: { revalidate: 300 },
      });
      if (!res.ok) return null; // fall through to the next provider
      const j: any = await res.json();
      const hits: SearchHit[] = (j.hits || []).map((h: any) => ({
        id: h.id,
        title: h.title || '',
        category: h.categoryId,
        subcategory: h.subcategory,
        city: h.city,
        country: h.country,
        location: h.location,
        latitude: h.latitude ?? null,
        longitude: h.longitude ?? null,
        quality: h.quality_score ?? 0,
        thumbnail: h.thumbnail ?? null,
      }));
      return {
        hits,
        found: j.totalHits ?? j.estimatedTotalHits ?? hits.length,
        page, perPage,
        provider: this.name,
        tookMs: Date.now() - t0,
      };
    } catch {
      return null; // engine unreachable → caller falls back to Firestore
    }
  },
};
