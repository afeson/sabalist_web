'use strict';
/* Back-office re-categorization for ALREADY-IMPORTED OSM listings.
 *
 * The original Overpass connector dumped many distinct shop types into the
 * `services` category (camera, books, musical instrument, bicycle, art, …)
 * because its SHOP_MAP only covered a subset. The connector is now fixed, but a
 * re-crawl only re-touches whatever Overpass happens to return on that run. This
 * script deterministically corrects EVERY imported OSM listing by re-deriving
 * [category, subcategory] from the titleized OSM "kind" embedded in its
 * description ("<Kind> in <city>…"), using the connector's own (now-correct)
 * tag maps — no network, idempotent.
 *
 * Safety:
 *  - Only touches listings whose source starts with "osm-".
 *  - Only moves a listing when the kind maps to a DIFFERENT, valid category
 *    (i.e. the kind genuinely belongs elsewhere) OR to a more specific valid
 *    subcategory within the same category. Never moves a listing INTO the
 *    generic `services` bucket, and never blanks an existing valid subcategory.
 *  - category label is kept in sync via the canonical taxonomy.
 *
 *   node recategorize-osm.js          # dry run
 *   node recategorize-osm.js --apply  # write changes
 */
const admin = require('firebase-admin');
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const { mapForKind } = require('./connectors/overpass');
const { CATEGORIES, VALID_SUBS } = require('./lib/taxonomy');
const LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const APPLY = process.argv.includes('--apply');

function kindOf(desc) {
  const m = String(desc || '').match(/^(.*?)\s+in\s+/);
  if (!m) return '';
  let k = m[1].trim().toLowerCase();
  if (/\brestaurant\b/.test(k)) return 'restaurant';
  if (/\bcafe\b/.test(k)) return 'cafe';
  if (/\bfast food\b/.test(k)) return 'fast food';
  return k;
}

(async () => {
  const snap = await db.collection('listings').get();
  let batch = db.batch(), n = 0, movedCat = 0, refinedSub = 0, skip = 0;
  const catMoves = {}, subMoves = {};
  for (const d of snap.docs) {
    const x = d.data();
    if (!(x.source || '').startsWith('osm-')) continue;
    const kind = kindOf(x.description);
    if (!kind) { skip++; continue; }
    const [cat, sub] = mapForKind(kind);
    if (!cat || !VALID_SUBS[cat]) { skip++; continue; }

    const curCat = x.categoryId;
    const curSub = x.subcategory;
    const patch = {};

    // 1) Move category only when the kind clearly belongs to a NON-services
    //    category different from where it currently sits. Never push into services.
    if (cat !== 'services' && cat !== curCat) {
      patch.categoryId = cat;
      patch.category = LABEL[cat] || cat;
      // when changing category, take the mapped sub (or clear an invalid one)
      patch.subcategory = sub || '';
      catMoves[`${curCat}→${cat}`] = (catMoves[`${curCat}→${cat}`] || 0) + 1;
      movedCat++;
    } else if (cat === curCat && sub && VALID_SUBS[cat].has(sub) && (!curSub || !VALID_SUBS[cat].has(curSub))) {
      // 2) Same category: only fill/repair an empty or invalid subcategory.
      patch.subcategory = sub;
      subMoves[`${cat}/${sub}`] = (subMoves[`${cat}/${sub}`] || 0) + 1;
      refinedSub++;
    } else {
      skip++; continue;
    }

    if (APPLY) {
      batch.update(d.ref, patch); n++;
      if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write('.'); }
    }
  }
  if (APPLY && n > 0) await batch.commit();

  console.log(`\nOSM re-categorization ${APPLY ? '(APPLIED)' : '(DRY RUN)'}:`);
  console.log(`  category moved: ${movedCat} | subcategory refined: ${refinedSub} | skipped: ${skip}`);
  console.log('  top category moves:', Object.entries(catMoves).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => k + ':' + v).join(', ') || '(none)');
  console.log('  top sub refinements:', Object.entries(subMoves).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => k + ':' + v).join(', ') || '(none)');
  if (!APPLY) console.log('  re-run with --apply to write.');
  process.exit(0);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
