#!/usr/bin/env node
'use strict';
/**
 * Backfill `searchKeywords` + `title_lc` (lib/searchKeywords.js) onto existing
 * listings so the $0 Firestore search fallback (/api/search) can match them.
 * New imports get the fields from the pipeline; this covers the ~2.45M docs
 * imported before the fields existed.
 *
 * Idempotent + resumable: skips docs that already carry title_lc, and pages by
 * document name, so re-running after a timeout simply continues the work.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT. Writes to `listings` only.
 */
const admin = require('firebase-admin');
const { buildSearchFields } = require('./lib/searchKeywords');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

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
      if (x.title_lc && Array.isArray(x.searchKeywords) && x.searchKeywords.length) continue; // done
      if (!x.title) continue; // nothing to index
      batch.set(d.ref, buildSearchFields(x), { merge: true });
      n++;
      if (n >= 400) { await batch.commit(); updated += n; batch = db.batch(); n = 0; }
    }
    if (n) { await batch.commit(); updated += n; }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
    if (scanned % 50000 < PAGE) console.log(`  …scanned ${scanned}, updated ${updated}`);
  }
  console.log('--- BACKFILL SEARCH KEYWORDS ---');
  console.log(JSON.stringify({ scanned, updated }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('backfill failed:', e.message); process.exit(1); });
