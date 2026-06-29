'use strict';
/* Cleanup: (1) remove true duplicate imports (same externalId or sourceKey —
   keep the most recently updated), (2) fix malformed categoryId 'real estate'
   -> 'real-estate'. Conservative: does NOT dedup by title (avoids false hits). */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('listings').get();
  const byKey = new Map(); // import key -> [{id, updatedAt}]
  let fixCat = 0;
  let batch = db.batch(), n = 0, deleted = 0, fixed = 0;
  const commit = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0; } };

  // group by import key
  snap.forEach((d) => {
    const x = d.data();
    const key = x.externalId || x.sourceKey;
    if (key) { (byKey.get(key) || byKey.set(key, []).get(key)).push({ ref: d.ref, updatedAt: String(x.updatedAt || '') }); }
  });

  // delete all but the newest in each duplicated key
  for (const [, arr] of byKey) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); // newest first
    for (let i = 1; i < arr.length; i++) { batch.delete(arr[i].ref); n++; deleted++; if (n >= 400) await commit(); }
  }

  // fix malformed category ids
  for (const d of snap.docs) {
    const x = d.data();
    if ((x.categoryId || x.category) === 'real estate') { batch.update(d.ref, { categoryId: 'real-estate', category: 'real-estate' }); n++; fixed++; if (n >= 400) await commit(); }
  }
  await commit();
  console.log(`cleanup: deleted ${deleted} duplicate import(s); fixed ${fixed} malformed-category doc(s).`);
  process.exit(0);
})().catch((e) => { console.error('cleanup failed:', e.message); process.exit(1); });
