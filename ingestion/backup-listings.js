#!/usr/bin/env node
'use strict';
/**
 * Listings backup (recovery half of the security safety net).
 *
 *   node backup-listings.js [outfile]        # default: ./listings-backup.ndjson
 *
 * Streams the entire `listings` collection to a newline-delimited JSON file
 * (one {id, ...data} object per line). The scheduled GitHub Action uploads it
 * as a build artifact (retained 90 days), so if listings are tampered with or
 * mass-deleted, they can be restored from the most recent snapshot.
 *
 * Restore (manual): read the NDJSON and re-write each doc by id via the admin
 * SDK (set(doc(id), data)). Kept intentionally simple/offline — no GCS bucket
 * or gcloud required. For point-in-time recovery, ALSO enable Firestore managed
 * backups in the Firebase console (recommended; see the runbook).
 *
 * Read-only over `listings`. Credentials follow the compute-source-quality.js pattern.
 */
const fs = require('fs');
const admin = require('firebase-admin');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const outfile = process.argv[2] || 'listings-backup.ndjson';

(async () => {
  const stream = fs.createWriteStream(outfile, { flags: 'w' });
  const write = (line) => new Promise((res) => { if (!stream.write(line)) stream.once('drain', res); else res(); });

  const PAGE = 2000;
  let last = null;
  let total = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      await write(JSON.stringify({ id: d.id, ...d.data() }) + '\n');
      total++;
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
    console.log(`  …${total} so far`);
  }

  await new Promise((res, rej) => stream.end((err) => (err ? rej(err) : res())));
  const bytes = fs.statSync(outfile).size;
  console.log(`✅ backed up ${total} listings -> ${outfile} (${(bytes / 1e6).toFixed(1)} MB)`);
  process.exit(0);
})().catch((e) => { console.error('backup-listings failed:', e.message); process.exit(1); });
