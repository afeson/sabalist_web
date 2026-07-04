// Provider chain for Sabalist search. Order = preference; the first enabled
// provider that returns a response serves the request, anything else falls
// through. SEARCH_PROVIDER=firestore forces the $0 fallback even when an
// engine is configured (useful for cost drills and outage tests).
import type { SearchProvider, SearchRequest, SearchResponse } from './types';
import { meilisearchProvider } from './provider-meilisearch';
import { firestoreProvider } from './provider-firestore';

const FORCE = (process.env.SEARCH_PROVIDER || '').toLowerCase();

function chain(): SearchProvider[] {
  if (FORCE === 'firestore') return [firestoreProvider];
  if (FORCE === 'meilisearch') return [meilisearchProvider, firestoreProvider];
  return [meilisearchProvider, firestoreProvider]; // default: best engine first, $0 fallback last
}

export async function runSearch(req: SearchRequest): Promise<SearchResponse> {
  for (const p of chain()) {
    if (!p.enabled()) continue;
    try {
      const r = await p.search(req);
      if (r) return r;
    } catch { /* fall through to next provider */ }
  }
  // Absolute last resort — never throw at the API surface.
  return { hits: [], found: 0, page: req.page || 1, perPage: req.perPage || 20, provider: 'none', tookMs: 0, degraded: true };
}

export type { SearchRequest, SearchResponse, SearchHit, SearchProvider } from './types';
