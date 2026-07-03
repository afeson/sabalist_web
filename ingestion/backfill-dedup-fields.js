#!/usr/bin/env node
'use strict';
/**
 * Backfill Dedup v2 fields (Phase 3) onto existing listings.
 *
 * Stamps geohash6/7, phoneE164, domain, nameNorm, nameKey (from each doc's
 * existing title / lat-lon / phoneNumber / website) so dedup v2 blocking + scoring
 * works against listings imported before those fields existed. Idempotent —
 * skips docs that already have nameKey + (geohash7 when coords exist).
 *
 * Env: FIREBASE_SERVICE_ACCOUNT. Read/write over `listings` only.
 */
const admin = require('firebase-admin');
const normalize = require('./lib/normalize');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const hasCoords = (x) => typeof x.latitude === 'number' && typeof x.longitude === 'number';

(async () => {
  const PAGE = 1000;
  let last = null, scanned = 0, updated = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    let batch = db.batch(), n = 0;
    for (const d of snap.docs) {
      const x = d.data();
      scanned++;
      const needCoordHash = hasCoords(x) && !x.geohash7;
      if (x.nameKey && !needCoordHash) continue; // already backfilled
      const nm = normalize.nameNorm(x.title);
      const patch = {
        nameNorm: nm.norm,
        nameKey: nm.key,
        geohash6: normalize.geohashOf(x.latitude, x.longitude, 6),
        geohash7: normalize.geohashOf(x.latitude, x.longitude, 7),
        phoneE164: normalize.phoneE164(x.phoneNumber, x.countryCode),
        domain: normalize.domainOf(x.website || x.url || x.sourceUrl),
      };
      batch.set(d.ref, patch, { merge: true });
      n++;
      if (n >= 400) { await batch.commit(); updated += n; batch = db.batch(); n = 0; }
    }
    if (n) { await batch.commit(); updated += n; }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
    console.log(`  …scanned ${scanned}, updated ${updated}`);
  }
  console.log('--- BACKFILL DEDUP FIELDS ---');
  console.log(JSON.stringify({ scanned, updated }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('backfill failed:', e.message); process.exit(1); });
