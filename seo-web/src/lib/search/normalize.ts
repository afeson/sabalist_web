// Query-side normalizer. MUST mirror how ingestion builds `searchKeywords`
// (ingestion/lib/searchKeywords.js): lowercase → NFD diacritic strip → split on
// non-alphanumerics. Non-Latin scripts (Arabic/Amharic/…) pass through as-is —
// the ingest side stores BOTH the original-script tokens and transliterated
// tokens, so a query in either form matches. Dependency-free by design: this
// runs in the Next.js route on every request.

const STOP = new Set(['the', 'and', 'of', 'in', 'at', 'de', 'la', 'le', 'el', 'al']);

export function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip combining diacritics (café → cafe)
}

export function tokenize(text: string, max = 10): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  // \p{L}\p{N} keeps letters/digits across all scripts (Arabic, Amharic, Latin…)
  for (const raw of String(text || '').split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    const tok = normalizeToken(raw);
    if (tok.length < 2 || STOP.has(tok) || seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= max) break;
  }
  return out;
}

export function prefixOf(text: string): string {
  return normalizeToken(String(text || '').trim()).slice(0, 40);
}
