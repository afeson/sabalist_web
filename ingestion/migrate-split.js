#!/usr/bin/env node
'use strict';
/**
 * Option A migration — split the mixed `listings` collection into two real
 * systems:
 *   businesses          — permanent directory profiles (imported records)
 *   classified_listings — user marketplace ads (African only)
 *
 * Classification per source doc:
 *   • business  → has `source`, OR claimable===true, OR userId==='imported-listings'
 *                 → copied to `businesses` with type:'business'
 *   • ad (rest) → African country  → copied to `classified_listings`, type:'listing'
 *                 non-African       → DROPPED (old demo/seed junk)
 *                 unknown country   → kept in classified_listings (conservative)
 *
 * NON-DESTRUCTIVE: copies to the new collections and stamps each source doc with
 * `_split` for idempotent resume; the original `listings` docs are left intact as
 * a backup until reads are switched over and the split is verified (cleanup is a
 * separate, explicit step). Target doc IDs match source IDs.
 *
 * CLI: node migrate-split.js [--dry] [--limit N]
 * Env: FIREBASE_SERVICE_ACCOUNT
 */
const admin = require('firebase-admin');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const limit = Number((argv[argv.indexOf('--limit') + 1]) || 0) || 0;

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const AF = new Set(['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cape Verde','Cameroon','Central African Republic','Chad','Comoros','Congo','DR Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau',"Cote d'Ivoire",'Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe']);

function isAfrican(d) {
  if (d.country && AF.has(String(d.country).trim())) return true;
  const loc = String(d.location || '');
  for (const name of AF) if (loc.includes(name)) return true;
  return d.country ? false : null; // false = known non-African; null = unknown
}
function classify(d) {
  const isBiz = !!d.source || d.claimable === true || d.userId === 'imported-listings';
  if (isBiz) return { target: 'businesses', type: 'business' };
  const af = isAfrican(d);
  if (af === false) return { target: null, type: 'dropped' }; // non-African demo/seed
  return { target: 'classified_listings', type: 'listing' };  // African or unknown
}

(async () => {
  const PAGE = 500;
  let last = null, scanned = 0;
  const stat = { businesses: 0, classified_listings: 0, dropped: 0, already: 0 };
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    // Each migrated doc = up to 2 writes (target copy + source marker). Firestore
    // batches cap at 500 ops, so flush at ~200 docs (≤400 ops).
    let batch = dry ? null : db.batch(); let ops = 0;
    for (const doc of snap.docs) {
      scanned++;
      const d = doc.data();
      if (d._split) { stat.already++; continue; }
      const { target, type } = classify(d);
      stat[type === 'dropped' ? 'dropped' : target]++;
      if (dry) continue;
      if (target) {
        batch.set(db.collection(target).doc(doc.id), { ...d, type, migratedAt: new Date().toISOString() }, { merge: true });
        ops++;
      }
      batch.set(doc.ref, { _split: type }, { merge: true });
      ops++;
      if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    if (!dry && ops) await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    if (scanned % 25000 < PAGE) console.log(`  …scanned ${scanned} | biz ${stat.businesses} ads ${stat.classified_listings} dropped ${stat.dropped}`);
    if (limit && scanned >= limit) break;
    if (snap.size < PAGE) break;
  }
  console.log(`\n── SPLIT MIGRATION ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(JSON.stringify({ scanned, ...stat }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('migration failed:', e.message); process.exit(1); });
