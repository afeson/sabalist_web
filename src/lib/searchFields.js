/**
 * Create/update-time search-field stamper for app-created listings.
 *
 * WHY: the $0 Firestore search fallback in seo-web finds listings with
 *   where('searchKeywords', 'array-contains-any', tokens)
 * and autocompletes with orderBy('title_lc'). Those two fields were only ever
 * stamped by the ingestion pipeline, so every listing created through the app
 * was invisible to Sabalist's own search. This stamps them at write time.
 *
 * MUST stay in sync with:
 *   query side  : seo-web/src/lib/search/normalize.ts  (tokenize / prefixOf)
 *   ingest side : ingestion/lib/searchKeywords.js      (buildSearchFields)
 *
 * Difference from the ingest side, deliberate: no `transliteration` dependency
 * (we do not add a package to the app bundle for this). Latin-script titles are
 * unaffected; a non-Latin title still matches a query in the same script,
 * because the query-side tokenizer passes non-Latin through unchanged.
 *
 * Additive only. Never returns a field that overwrites listing content.
 */

const STOP = new Set(['the', 'and', 'of', 'in', 'at', 'de', 'la', 'le', 'el', 'al']);
const MAX_KEYWORDS = 25;

// Unicode property escapes need a modern engine. Hermes/older Android WebViews
// can throw on the pattern, so compile once and keep an ASCII-safe fallback.
let SPLIT_RE;
try {
  SPLIT_RE = new RegExp('[^\\p{L}\\p{N}]+', 'u');
} catch (e) {
  SPLIT_RE = /[^0-9A-Za-zÀ-￿]+/;
}

export function normTok(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function tokensOf(text) {
  const out = [];
  for (const raw of String(text || '').split(SPLIT_RE)) {
    if (!raw) continue;
    const tok = normTok(raw);
    if (tok.length < 2 || STOP.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

/** "Hyattsville, MD, USA" -> "Hyattsville" */
export function cityOf(location) {
  return String(location || '').split(',')[0].trim();
}

/** "Hyattsville, MD, USA" -> "USA"; single-part locations -> "" */
export function countryOf(location) {
  const parts = String(location || '').split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
}

/**
 * Build the additive search fields from a listing-shaped object.
 * Returns { searchKeywords, title_lc, city, country }.
 */
export function buildSearchFields(docLike) {
  const d = docLike || {};
  const title = d.title || '';
  const city = d.city || cityOf(d.location);
  const country = d.country || countryOf(d.location);

  const seen = new Set();
  const keywords = [];
  const push = (toks) => {
    for (const t of toks) {
      if (!seen.has(t) && keywords.length < MAX_KEYWORDS) { seen.add(t); keywords.push(t); }
    }
  };

  push(tokensOf(title));
  push(tokensOf(d.categoryId || d.category));
  push(tokensOf(d.subcategory));
  push(tokensOf(city));
  push(tokensOf(country));

  return {
    searchKeywords: keywords,
    title_lc: normTok(title).slice(0, 60),
    city,
    country,
  };
}
