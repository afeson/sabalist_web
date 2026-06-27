'use strict';
/**
 * One-time backfill: convert imported listings' createdAt/updatedAt from
 * Firestore Timestamp to ISO STRING so they sort consistently with the app's
 * organic listings (which use ISO strings). Only touches docs with a `source`
 * (imports); organic listings are left untouched.
 */
(async () => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const snap = await db.collection('listings').where('source', '!=', '').get();
  console.log(`imported docs: ${snap.size}`);
  let batch = db.batch(), n = 0, committed = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const created = typeof x.createdAt === 'string'
      ? x.createdAt
      : (x.importedAt || (x.createdAt && x.createdAt.toDate && x.createdAt.toDate().toISOString()) || new Date().toISOString());
    const updated = typeof x.updatedAt === 'string'
      ? x.updatedAt
      : (x.importedAt || created);
    // skip if already strings
    if (typeof x.createdAt === 'string' && typeof x.updatedAt === 'string') continue;
    batch.update(d.ref, { createdAt: created, updatedAt: updated });
    n++;
    if (n % 400 === 0) { await batch.commit(); committed += 400; batch = db.batch(); console.log(`  committed ${committed}`); }
  }
  if (n % 400 !== 0) { await batch.commit(); }
  console.log(`backfilled ${n} docs to ISO-string dates.`);
  process.exit(0);
})().catch((e) => { console.error('backfill failed:', e.message); process.exit(1); });
