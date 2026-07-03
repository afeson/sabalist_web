'use strict';
/**
 * Dedup v2 matcher (Phase 3). Scores a candidate listing against existing
 * candidates using name similarity + geo proximity + phone/domain identity +
 * category, and decides merge / review / distinct. Replaces the fuzzy half of
 * lib/dedup.js `classify()` (the exact `sourceKey` re-sync identity is kept).
 *
 * Records passed in must carry the normalize.js fields: nameNorm, nameKey,
 * latitude, longitude, phoneE164, domain, categoryId, sourceKey.
 */

// Tunable thresholds (one place; tuned against test/match.eval.js).
const T = { merge: 0.82, review: 0.62 };
const W = { name: 0.45, geo: 0.30, phone: 0.15, domain: 0.10 };

function tokens(norm) { return String(norm || '').split(/\s+/).filter(Boolean); }
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function containment(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
}
function trigrams(s) {
  const t = String(s || '').replace(/\s+/g, '');
  const g = new Set(); for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3));
  return g;
}
function trigramSim(a, b) {
  const A = trigrams(a), B = trigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function nameScore(a, b) {
  const ta = tokens(a.nameNorm), tb = tokens(b.nameNorm);
  return Math.max(jaccard(ta, tb), containment(ta, tb), trigramSim(a.nameNorm, b.nameNorm));
}
function haversineM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toR, dLon = (b.longitude - a.longitude) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * toR) * Math.cos(b.latitude * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function geoScore(a, b) {
  if (typeof a.latitude !== 'number' || typeof b.latitude !== 'number') return null;
  const d = haversineM(a, b);
  return { s: Math.exp(-d / 108), d }; // ≈1@0m, 0.5@75m, 0.1@250m
}
const catSame = (a, b) => a.categoryId && b.categoryId && a.categoryId === b.categoryId;
const catConflict = (a, b) => a.categoryId && b.categoryId && a.categoryId !== b.categoryId;

/** Pairwise score 0..1 + component detail. */
function score(a, b) {
  const s_name = nameScore(a, b);
  const g = geoScore(a, b);
  const s_geo = g ? g.s : null;
  const dist = g ? g.d : null;
  const s_phone = a.phoneE164 && b.phoneE164 ? (a.phoneE164 === b.phoneE164 ? 1 : 0) : null;
  const s_domain = a.domain && b.domain ? (a.domain === b.domain ? 1 : 0) : null;

  // Strong-identity short-circuits (corroborated by phone/domain/geo) — but a
  // category CONFLICT (e.g. a restaurant vs a hotel with the same name at the same
  // address) blocks them; those fall through to the penalized blend below.
  if (!catConflict(a, b)) {
    if (s_phone === 1 && s_name >= 0.6) return { score: 0.95, s_name, s_geo, dist, corroborated: true, why: 'phone+name' };
    if (s_domain === 1 && s_name >= 0.6) return { score: 0.95, s_name, s_geo, dist, corroborated: true, why: 'domain+name' };
    if (s_name >= 0.9 && dist != null && dist <= 150) return { score: 0.9, s_name, s_geo, dist, corroborated: true, why: 'name+geo' };
  }

  // Weighted blend over non-null components.
  let sum = 0, wsum = 0;
  const add = (w, s) => { if (s != null) { sum += w * s; wsum += w; } };
  add(W.name, s_name); add(W.geo, s_geo); add(W.phone, s_phone); add(W.domain, s_domain);
  let sc = wsum ? sum / wsum : 0;
  if (catConflict(a, b)) sc *= 0.5;              // different category → likely different business
  // Corroborated = at least one identity/location signal beyond the name.
  const corroborated = s_geo != null || s_phone != null || s_domain != null;
  return { score: sc, s_name, s_geo, dist, corroborated, why: 'blend' };
}

/**
 * Classify against existing candidates.
 * Returns { kind:'update'|'duplicate'|'uncertain'|'none', matchId?, similarity? }.
 */
function classify(candidate, existing = []) {
  // 1) Exact identity (re-sync) wins — unchanged from v1.
  const exact = existing.find((e) => e.sourceKey && e.sourceKey === candidate.sourceKey);
  if (exact) return { kind: 'update', matchId: exact.id };

  // 2) Never fuzzy-merge on an EMPTY name (e.g. transliterated to nothing) unless
  // a hard identity (phone/domain) exists. Single-token brand names (Vodacom,
  // Shoprite) are allowed — but only the corroborated short-circuits below
  // (name+close-geo, phone, domain) can merge them, never the weak blend.
  const emptyName = tokens(candidate.nameNorm).length < 1;
  const hasHard = !!(candidate.phoneE164 || candidate.domain);
  if (emptyName && !hasHard) return { kind: 'none' };
  const singleToken = tokens(candidate.nameNorm).length < 2;

  // 3) Best fuzzy score.
  let best = null;
  for (const e of existing) {
    if (e.id === (exact && exact.id)) continue;
    const r = score(candidate, e);
    if (!best || r.score > best.score) best = { ...r, id: e.id };
  }
  if (!best) return { kind: 'none' };
  // Auto-merge requires corroboration (geo/phone/domain) — never on name alone.
  if (best.score >= T.merge && best.corroborated) return { kind: 'duplicate', matchId: best.id, similarity: best.score };
  if (best.score >= T.review) return { kind: 'uncertain', matchId: best.id, similarity: best.score };
  return { kind: 'none' };
}

module.exports = { classify, score, nameScore, haversineM, T, W };
