#!/usr/bin/env node
'use strict';
/**
 * Rebuild the Typesense search index from Firestore (source of truth).
 *
 * Used for the Phase 1 initial bulk load and as the nightly reconciler: streams
 * all ACTIVE listings and upserts them into the index (the index is a disposable
 * projection — this can run any time to re-sync). Idempotent.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT (read Firestore) + TYPESENSE_URL + TYPESENSE_ADMIN_KEY.
 */
const admin = require('firebase-admin');
const search = require('./lib/search');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

(async () => {
  if (!search.isEnabled()) {
    console.error('TYPESENSE_URL / TYPESENSE_ADMIN_KEY not set — nothing to do.');
    process.exit(1);
  }
  console.log('ensuring collection…');
  if (!(await search.ensureCollection())) { console.error('could not ensure collection'); process.exit(1); }

  const PAGE = 1000;
  let last = null, scanned = 0, active = 0, indexed = 0, failed = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const rows = [];
    snap.forEach((d) => {
      const x = d.data();
      scanned++;
      if (!x.status || x.status === 'active') { active++; rows.push({ id: d.id, ...x }); }
    });
    if (rows.length) { const r = await search.bulkImport(rows); indexed += r.ok; failed += r.failed; }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
    console.log(`  …scanned ${scanned}, indexed ${indexed}`);
  }

  const summary = { scanned, active, indexed, failed, ranAtIso: new Date().toISOString() };
  await db.collection('data_stats').doc('search_reindex').set({
    ...summary, ranAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: false });
  console.log('--- SEARCH REINDEX ---');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
})().catch((e) => { console.error('reindex failed:', e.message); process.exit(1); });
