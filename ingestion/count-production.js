'use strict';
/**
 * Read-only production audit: count live `listings` by category and by source.
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json node count-production.js
 */
(async () => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      : admin.credential.applicationDefault();
    admin.initializeApp({ credential: cred });
  }
  const db = admin.firestore();

  const snap = await db.collection('listings').get();
  const byCat = {}, bySource = {}, byStatus = {};
  let total = 0, imported = 0, organic = 0;
  snap.forEach((d) => {
    const x = d.data() || {};
    total++;
    const cat = x.categoryId || x.category || '(none)';
    byCat[cat] = (byCat[cat] || 0) + 1;
    const src = x.source || '(organic/app)';
    bySource[src] = (bySource[src] || 0) + 1;
    const st = x.status || '(none)';
    byStatus[st] = (byStatus[st] || 0) + 1;
    if (x.source) imported++; else organic++;
  });

  const sort = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  console.log(`\n=== PRODUCTION listings: ${total} total (${imported} imported, ${organic} organic/app) ===`);
  console.log('\nBy CATEGORY:');
  for (const [k, v] of sort(byCat)) console.log(`  ${String(v).padStart(5)}  ${k}`);
  console.log('\nBy SOURCE:');
  for (const [k, v] of sort(bySource)) console.log(`  ${String(v).padStart(5)}  ${k}`);
  console.log('\nBy STATUS:');
  for (const [k, v] of sort(byStatus)) console.log(`  ${String(v).padStart(5)}  ${k}`);

  // staging (review queue) too
  try {
    const stg = await db.collection('listings_staging').where('status', '==', 'pending').get();
    console.log(`\nReview queue (listings_staging, pending): ${stg.size}`);
  } catch {}
  process.exit(0);
})().catch((e) => { console.error('audit failed:', e.message); process.exit(1); });
