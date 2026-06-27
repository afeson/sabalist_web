'use strict';
/**
 * Backfill a boolean `hasImage` on every listing (organic + imported) so the
 * marketplace can rank photo-bearing listings first. Mirrors the UI's image
 * detection (normalizeListingImages): any valid URL in coverImage/image/
 * imageUrl/photo/thumbnail or images[]/photos[]/media[].
 */
const SINGLE = ['coverImage', 'image', 'imageUrl', 'photo', 'thumbnail'];
const ARRAY = ['images', 'photos', 'media'];
const ok = (v) => typeof v === 'string' && /^(https?:\/\/|\/|data:image)/.test(v.trim());
function hasImage(x) {
  for (const f of SINGLE) if (ok(x[f])) return true;
  for (const f of ARRAY) {
    const a = x[f];
    if (Array.isArray(a) && a.some((e) => ok(e) || (e && ok(e.url)) || (e && ok(e.uri)))) return true;
  }
  return false;
}
(async () => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();
  const snap = await db.collection('listings').get();
  let batch = db.batch(), n = 0, withImg = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const h = hasImage(x);
    if (h) withImg++;
    if (x.hasImage === h) continue; // skip unchanged
    batch.update(d.ref, { hasImage: h });
    n++;
    if (n % 400 === 0) { await batch.commit(); batch = db.batch(); console.log(`  committed ${n}`); }
  }
  if (n % 400 !== 0) await batch.commit();
  console.log(`backfilled hasImage on ${n} docs. total with image: ${withImg}/${snap.size}`);
  process.exit(0);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
