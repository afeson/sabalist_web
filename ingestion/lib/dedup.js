'use strict';
/**
 * Duplicate detection.
 *
 * Two layers:
 *  1) Deterministic identity — a stable `sourceKey` (source + the source's own
 *     id/url) lets us recognize the SAME listing on re-sync and update it.
 *  2) Fuzzy fingerprint — a normalized title+location+price signature plus a
 *     token-overlap score catches the SAME item posted via different sources.
 *
 * Returns a verdict the pipeline turns into: update / publish / send-to-review.
 */

const crypto = require('crypto');

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9À-￿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }

/** Stable identity for a record from a given source (for re-sync upserts). */
function sourceKey(sourceId, raw) {
  const id = raw.externalId || raw.id || raw.guid || raw.url || raw.link || '';
  return `${sourceId}:${hash(norm(id) || norm(`${raw.title}|${raw.price}|${raw.location}`))}`;
}

/** Cross-source fuzzy fingerprint (title + city + rounded price + category). */
function fingerprint(listing) {
  const title = norm(listing.title).split(' ').slice(0, 8).join(' ');
  const city = norm(listing.city || listing.location).split(' ')[0] || '';
  const bucket = bucketPrice(listing.amount ?? listing.price);
  return hash(`${listing.categoryId || ''}|${title}|${city}|${bucket}`);
}

function bucketPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return 'na';
  // log-ish buckets so near prices collide but very different ones don't.
  return Math.round(Math.log10(n + 1) * 4);
}

function tokenSet(s) { return new Set(norm(s).split(' ').filter((w) => w.length > 2)); }
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Compare a candidate against existing listings (already-fetched matches by
 * sourceKey or fingerprint). Returns:
 *   { kind: 'new' | 'update' | 'duplicate' | 'uncertain', matchId, similarity }
 */
function classify(candidate, existing = []) {
  // 1) Exact identity (same source listing) → update.
  const exact = existing.find((e) => e.sourceKey && e.sourceKey === candidate.sourceKey);
  if (exact) return { kind: 'update', matchId: exact.id, similarity: 1 };

  // 2) Fuzzy title similarity within same category.
  const candTokens = tokenSet(candidate.title);
  let best = null, bestSim = 0;
  for (const e of existing) {
    if (e.categoryId && candidate.categoryId && e.categoryId !== candidate.categoryId) continue;
    const sim = jaccard(candTokens, tokenSet(e.title));
    if (sim > bestSim) { bestSim = sim; best = e; }
  }
  if (best) {
    if (bestSim >= 0.85) return { kind: 'duplicate', matchId: best.id, similarity: bestSim };
    if (bestSim >= 0.6) return { kind: 'uncertain', matchId: best.id, similarity: bestSim };
  }
  return { kind: 'new', matchId: null, similarity: bestSim };
}

module.exports = { sourceKey, fingerprint, classify, jaccard, norm };
