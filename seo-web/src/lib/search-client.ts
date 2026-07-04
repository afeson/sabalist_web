// Server-side Typesense query client for the SEO pages. Read-only (uses the
// scoped search-only key). Returns matching listing IDs + the accurate total
// count; the caller hydrates full docs from Firestore. If Typesense is unset or
// errors, returns null so callers fall back to the existing Firestore queries.
const URL = (process.env.TYPESENSE_URL || '').replace(/\/$/, '');
const KEY = process.env.TYPESENSE_SEARCH_KEY || '';

// RETIRED 2026-07-04: the Typesense VM was decommissioned (in-memory index
// OOM'd at 2.45M docs). Search now runs through the vendor-neutral provider
// chain in lib/search/ (/api/search); SEO pages use their built-in Firestore
// paths. This module is kept only so legacy imports keep compiling — it always
// reports disabled so no request ever waits on a dead endpoint. To re-enable a
// Typesense engine, flip RETIRED and set the env vars.
const RETIRED = true;

export function searchEnabled(): boolean {
  return !RETIRED && !!(URL && KEY);
}

export async function searchListingIds(
  params: Record<string, string>,
): Promise<{ ids: string[]; found: number } | null> {
  if (!searchEnabled()) return null;
  const qs = new URLSearchParams({ include_fields: 'id', ...params }).toString();
  try {
    const res = await fetch(`${URL}/collections/listings/documents/search?${qs}`, {
      headers: { 'X-TYPESENSE-API-KEY': KEY },
      signal: AbortSignal.timeout(2500), // fail fast to Firestore if the engine is down
      next: { revalidate: 300 }, // cache identical searches for 5 min
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return { ids: (j.hits || []).map((h: any) => h.document.id), found: j.found || 0 };
  } catch {
    return null;
  }
}

// Typesense filter values that contain spaces or punctuation must be backtick-quoted.
export function tsValue(v: string): string {
  return '`' + String(v).replace(/`/g, '') + '`';
}
