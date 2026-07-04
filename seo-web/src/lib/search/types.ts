// Sabalist search contract — the STABLE seam between all clients (web, mobile)
// and whatever engine runs underneath. Clients call /api/search and depend on
// these shapes only. Engines (Firestore fallback, Meilisearch, OpenSearch, …)
// implement SearchProvider; swapping engines is an env flip, never an app change.

export interface SearchRequest {
  q?: string;            // free-text query (optional — filters-only browse is valid)
  country?: string;      // display name, e.g. "Nigeria"
  city?: string;         // display name, e.g. "Lagos"
  category?: string;     // canonical categoryId, e.g. "food"
  subcategory?: string;  // canonical sub id
  page?: number;         // 1-based
  perPage?: number;      // default 20, max 50
  mode?: 'search' | 'autocomplete';
  // Reserved for geo ranking (Meilisearch/OpenSearch providers implement it;
  // the Firestore fallback ignores it):
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface SearchHit {
  id: string;
  title: string;
  category?: string;
  subcategory?: string;
  city?: string;
  country?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  quality?: number;
  thumbnail?: string | null;
}

export interface SearchResponse {
  hits: SearchHit[];
  found: number;         // total matches (may be approximate on the fallback provider)
  page: number;
  perPage: number;
  provider: string;      // which engine served this — for observability, not client logic
  tookMs: number;
  degraded?: boolean;    // true when served by the limited fallback provider
}

export interface SearchProvider {
  name: string;
  enabled(): boolean;
  search(req: SearchRequest): Promise<SearchResponse | null>; // null → try next provider
}
