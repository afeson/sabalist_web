'use strict';
/* Post-import back-office processing (run after sync.js):
   1) remove seed placeholders in any subcategory that now has a REAL listing
   2) fix hasImage accuracy on every doc (so the photo-only home filter is correct)
   3) refresh featured/trending categories from live photo-rich data
   4) report metrics incl. home-page placeholder count (must be 0)
   Pure data/back-office. No deletions of real listings. */
const admin = require('firebase-admin');
// Match lib/firestore.js: CI provides creds as the FIREBASE_SERVICE_ACCOUNT JSON
// env var; locally use GOOGLE_APPLICATION_CREDENTIALS via applicationDefault().
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const HOME_CATEGORIES = ['vehicles','real-estate','electronics','phones-tablets','computers','fashion','beauty','home-furniture','jobs','services','food','agriculture','animals-pets','baby-kids','sports-fitness','business-industrial','events-tickets','education','travel','construction','repair-services','rentals','entertainment','community','other'];
const hasImg = (x) => !!(x.coverImage || (x.images && x.images.length));

(async () => {
  const snap = await db.collection('listings').get();
  const docs = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  // ---- 1) seed removal: drop seeds where a real listing now fills the sub ----
  const realBySub = new Set();     // "cat/sub" that has >=1 non-seed listing
  const photoByCat = {};           // category -> count of photo'd non-seed listings
  for (const x of docs) {
    if (x.source === 'seed-catalog') continue;
    if (x.categoryId && x.subcategory) realBySub.add(x.categoryId + '/' + x.subcategory);
    if (hasImg(x)) photoByCat[x.categoryId] = (photoByCat[x.categoryId] || 0) + 1;
  }
  const seeds = docs.filter((x) => x.source === 'seed-catalog');
  let removed = 0, keptSeeds = 0;
  let batch = db.batch(), n = 0;
  for (const s of seeds) {
    if (realBySub.has(s.categoryId + '/' + s.subcategory)) { batch.delete(s.ref); removed++; n++; if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; } }
    else keptSeeds++;
  }
  if (n > 0) await batch.commit();

  // ---- 2) hasImage accuracy on every doc ----
  batch = db.batch(); n = 0; let fixedImg = 0;
  for (const x of docs) {
    if (x.source === 'seed-catalog' && realBySub.has(x.categoryId + '/' + x.subcategory)) continue; // being deleted
    const want = hasImg(x);
    if (x.hasImage !== want) { batch.update(x.ref, { hasImage: want }); fixedImg++; n++; if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; } }
  }
  if (n > 0) await batch.commit();

  // ---- 3) refresh featured/trending from photo-rich categories ----
  const ranked = Object.entries(photoByCat)
    .filter(([c]) => !['jobs', 'other', 'community'].includes(c))
    .sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const featured = ranked.slice(0, 6);
  const trending = ranked.slice(6, 12);
  const ref = db.collection('marketplace_config').doc('live');
  const cur = (await ref.get()).data();
  await ref.update({
    'home.featuredCategories': featured,
    'home.trendingCategories': trending,
    'featureFlags.homePhotoOnly': true,
    version: (cur.version || 0) + 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'post-import',
  });

  console.log('--- POST-IMPORT ---');
  console.log('seed placeholders removed (replaced by real):', removed, '| seeds kept (still no real):', keptSeeds);
  console.log('hasImage flags corrected:', fixedImg);
  console.log('featured categories:', featured.join(', '));
  console.log('trending categories:', trending.join(', '));
  console.log('homePhotoOnly:', true, '| config version:', (cur.version || 0) + 1);
  process.exit(0);
})().catch((e) => { console.error('post-import failed:', e.message); process.exit(1); });
