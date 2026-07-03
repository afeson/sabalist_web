'use strict';
// Offline unit tests for the search-doc mapper + quality_score (no client/network).
const assert = require('assert');
const s = require('../lib/search');

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); console.log('  ✓', m); pass++; };

// toSearchDoc: full-featured claimed listing with coords
const doc = s.toSearchDoc('abc123', {
  title: 'Yellow Chilli Restaurant', description: 'x'.repeat(300), sellerName: 'Yellow Chilli',
  categoryId: 'food', category: 'food', subcategory: 'restaurants', country: 'Nigeria', city: 'Lagos',
  location: 'Lagos, Nigeria', status: 'active', claimable: true, businessVerified: true, aiEnriched: true,
  coverImage: 'https://x/y.jpg', phoneNumber: '+2348012345678', latitude: 6.4541, longitude: 3.3947,
  createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z',
});
ok(doc.id === 'abc123', 'id carried');
ok(doc.location_geo && doc.location_geo[0] === 6.4541 && doc.location_geo[1] === 3.3947, 'geopoint = [lat, lon]');
ok(doc.verified === true && doc.claimable === true && doc.hasImage === true && doc.hasContact === true, 'booleans derived');
ok(doc.createdAt === Math.floor(Date.parse('2026-07-01T00:00:00.000Z') / 1000)
   && doc.updatedAt === Math.floor(Date.parse('2026-07-02T00:00:00.000Z') / 1000), 'ISO dates → unix seconds');
// quality: verified 40 + image 25 + contact 20 + enriched 10 + desc bucket (300/120=2) = 97
ok(doc.quality_score === 97, 'quality_score = 97 (verified+image+contact+enriched+desc)');

// bare directory listing: no photo, contact via sourceUrl only, not verified
const bare = s.toSearchDoc('n1', { title: 'Corner Kiosk', description: 'Kiosk', country: 'Kenya',
  city: 'Nairobi', status: 'active', sourceUrl: 'https://openstreetmap.org/node/1' });
ok(bare.hasImage === false && bare.hasContact === true, 'sourceUrl counts as contact; no image');
ok(bare.quality_score === 20, 'bare listing scores 20 (contact only)');
ok(bare.location_geo === undefined, 'no coords → no geopoint field');

// env-gating: with no TYPESENSE_URL, client ops no-op safely
(async () => {
  delete process.env.TYPESENSE_URL; delete process.env.TYPESENSE_ADMIN_KEY;
  ok(s.isEnabled() === false, 'disabled when env unset');
  ok((await s.upsertListing('x', { title: 't' })) === false, 'upsert no-ops when disabled');
  ok((await s.removeListing('x')) === false, 'remove no-ops when disabled');
  ok((await s.ensureCollection()) === false, 'ensureCollection no-ops when disabled');
  console.log(`\nAll search tests passed (${pass}).`);
})();
