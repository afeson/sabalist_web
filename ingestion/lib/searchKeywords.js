'use strict';
/**
 * Search-keyword builder for the $0 Firestore search fallback (and useful
 * signal for any engine). Stamps two fields on every listing:
 *
 *   searchKeywords : deduped token array from title (original script AND
 *                    transliterated), category, subcategory, city, country.
 *                    Queried with array-contains-any by /api/search.
 *   title_lc       : lowercase, diacritic-stripped title (original script kept)
 *                    for prefix autocomplete via orderBy range scans.
 *
 * IMPORTANT: unlike lib/normalize.js#nameNorm (dedup-oriented — strips type
 * words like "restaurant"), this keeps ALL meaningful tokens because users
 * search exactly those words. Must stay in sync with the query-side tokenizer
 * (seo-web/src/lib/search/normalize.ts): lowercase → NFD diacritic strip →
 * split on non-alphanumerics → drop len<2.
 */
const { transliterate } = require('transliteration');

const STOP = new Set(['the', 'and', 'of', 'in', 'at', 'de', 'la', 'le', 'el', 'al']);
const MAX_KEYWORDS = 25;

function normTok(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokensOf(text) {
  const out = [];
  for (const raw of String(text || '').split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    const tok = normTok(raw);
    if (tok.length < 2 || STOP.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

/** Build { searchKeywords, title_lc } from a listing-shaped object. */
function buildSearchFields(doc) {
  const title = doc.title || '';
  const cityPart = String(doc.location || '').split(',')[0];
  const seen = new Set();
  const keywords = [];
  const push = (toks) => { for (const t of toks) { if (!seen.has(t) && keywords.length < MAX_KEYWORDS) { seen.add(t); keywords.push(t); } } };

  push(tokensOf(title));                       // original script (Arabic stays Arabic)
  push(tokensOf(transliterate(title)));        // Latin form (سمسم → smsm)
  push(tokensOf(doc.categoryId || doc.category));
  push(tokensOf(doc.subcategory));
  push(tokensOf(cityPart));
  push(tokensOf(doc.country));

  return {
    searchKeywords: keywords,
    title_lc: normTok(title).slice(0, 60),
  };
}

module.exports = { buildSearchFields, tokensOf };
