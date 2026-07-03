'use strict';
// Labeled dedup eval (Phase 3 gate): assert precision ≥ 0.97 — i.e. the matcher
// almost never AUTO-MERGES two genuinely different businesses (over-merge is the
// dangerous error). Recall (dups caught, incl. the review band) is reported too.
const assert = require('assert');
const n = require('../lib/normalize');
const match = require('../lib/match');

function rec(o) {
  const nm = n.nameNorm(o.name);
  return {
    id: o.id, sourceKey: o.sourceKey || o.id, nameNorm: nm.norm, nameKey: nm.key,
    latitude: o.lat, longitude: o.lon, phoneE164: n.phoneE164(o.phone, o.cc),
    domain: n.domainOf(o.website), categoryId: o.cat,
  };
}
// dLat 0.0003 ≈ 33m. Base near Lagos.
const [LA, LO] = [6.4541, 3.3947];
const pairs = [
  // ---- TRUE DUPLICATES (should merge or at least review) ----
  { dup: true, a: { id: 'a1', name: 'Mama Cass', lat: LA, lon: LO, cat: 'food' }, b: { id: 'b1', name: 'Mama Cass Restaurant', lat: LA + 0.0003, lon: LO, cat: 'food' } },
  { dup: true, a: { id: 'a2', name: 'KFC Lekki', phone: '08012345678', cc: 'NG', cat: 'food' }, b: { id: 'b2', name: 'KFC', phone: '0801 234 5678', cc: 'NG', cat: 'food' } },
  { dup: true, a: { id: 'a3', name: 'Shoprite', website: 'https://shoprite.co.za', cat: 'food' }, b: { id: 'b3', name: 'Shoprite Supermarket', website: 'www.shoprite.co.za/x', cat: 'food' } },
  { dup: true, a: { id: 'a4', name: 'Ocean Basket', lat: LA, lon: LO, cat: 'food' }, b: { id: 'b4', name: 'Ocean Basket', lat: LA + 0.0002, lon: LO + 0.0002, cat: 'food' } },
  { dup: true, a: { id: 'a5', name: 'Café Neo', lat: LA, lon: LO, cat: 'food' }, b: { id: 'b5', name: 'Cafe Neo', lat: LA + 0.0001, lon: LO, cat: 'food' } },
  { dup: true, a: { id: 'a6', name: 'Ecobank', domain: undefined, website: 'ecobank.com', cat: 'services' }, b: { id: 'b6', name: 'Ecobank Plc', website: 'https://ecobank.com/ng', cat: 'services' } },
  { dup: true, a: { id: 'a7', name: 'Vodacom Shop', phone: '+266 2200 0000', cat: 'phones-tablets' }, b: { id: 'b7', name: 'Vodacom', phone: '+26622000000', cat: 'phones-tablets' } },
  // ---- NON-DUPLICATES (must NOT auto-merge) ----
  { dup: false, a: { id: 'c1', name: 'Blue Restaurant', lat: LA, lon: LO, cat: 'food' }, b: { id: 'd1', name: 'Blue Hotel', lat: LA + 0.0002, lon: LO, cat: 'travel' } },
  { dup: false, a: { id: 'c2', name: 'Total', lat: LA, lon: LO, cat: 'vehicles' }, b: { id: 'd2', name: 'Total', lat: 9.0579, lon: 7.4951, cat: 'vehicles' } }, // chain, Lagos vs Abuja
  { dup: false, a: { id: 'c3', name: 'Nike Store', lat: LA, lon: LO, cat: 'fashion' }, b: { id: 'd3', name: 'Adidas Store', lat: LA + 0.00005, lon: LO, cat: 'fashion' } }, // same mall
  { dup: false, a: { id: 'c4', name: 'City Pharmacy', lat: LA, lon: LO, cat: 'services' }, b: { id: 'd4', name: 'Grand Pharmacy', lat: LA + 0.0001, lon: LO, cat: 'services' } },
  { dup: false, a: { id: 'c5', name: 'GTBank', phone: '08011111111', cc: 'NG', cat: 'services' }, b: { id: 'd5', name: 'Zenith Bank', phone: '08022222222', cc: 'NG', cat: 'services' } },
  { dup: false, a: { id: 'c6', name: 'St Mary School', lat: LA, lon: LO, cat: 'education' }, b: { id: 'd6', name: 'St Peter School', lat: LA + 0.00008, lon: LO, cat: 'education' } },
  { dup: false, a: { id: 'c7', name: 'The Place', lat: LA, lon: LO, cat: 'food' }, b: { id: 'd7', name: 'Another Place', lat: 5.6, lon: -0.18, cat: 'food' } }, // Accra, far
];

let tp = 0, fp = 0, fn = 0, reviewCaught = 0;
for (const p of pairs) {
  const v = match.classify(rec(p.a), [rec(p.b)]);
  const merged = v.kind === 'duplicate';
  const flagged = v.kind === 'duplicate' || v.kind === 'uncertain';
  if (p.dup) { if (merged) tp++; else { fn++; if (flagged) reviewCaught++; } }
  else if (merged) { fp++; console.log('  FALSE MERGE:', p.a.name, 'vs', p.b.name, '(sim', v.similarity?.toFixed(2) + ')'); }
}
const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
const recall = (tp + reviewCaught) / (tp + fn); // caught = auto-merged OR sent to review

console.log(`\n── Dedup v2 eval ──`);
console.log(`  auto-merged true dups (TP): ${tp}`);
console.log(`  false merges (FP): ${fp}`);
console.log(`  precision: ${precision.toFixed(3)} (target ≥ 0.97)`);
console.log(`  recall incl. review band: ${recall.toFixed(3)}`);

assert.ok(precision >= 0.97, `precision ${precision} < 0.97 — over-merging`);
assert.ok(fp === 0, `${fp} false merges`);
console.log('\n✅ Dedup v2 precision gate passed.');
