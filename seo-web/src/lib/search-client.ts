// Server-side Typesense query client for the SEO pages. Read-only (uses the
// scoped search-only key). Returns matching listing IDs + the accurate total
// count; the caller hydrates full docs from Firestore. If Typesense is unset or
// errors, returns null so callers fall back to the existing Firestore queries.
const URL = (process.env.TYPESENSE_URL || '').replace(/\/$/, '');
const KEY = process.env.TYPESENSE_SEARCH_KEY || '';

export function searchEnabled(): boolean {
  return !!(URL && KEY);
}

export async function searchListingIds(
  params: Record<string, string>,
): Promise<{ ids: string[]; found: number } | null> {
  if (!searchEnabled()) return null;
  const qs = new URLSearchParams({ include_fields: 'id', ...params }).toString();
  try {
    const res = await fetch(`${URL}/collections/listings/documents/search?${qs}`, {
      headers: { 'X-TYPESENSE-API-KEY': KEY },
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
