#!/usr/bin/env node
'use strict';
/**
 * Option A migration — NO-APP-REBUILD model.
 *
 *   businesses  — permanent directory profiles (COPIED here from `listings`)
 *   listings    — the marketplace (UNCHANGED collection the app already uses):
 *                 keeps only real African ads; businesses + non-African junk removed
 *
 * Two phases (run copy first, verify `businesses`, then cleanup):
 *   COPY (default):  business → copy to `businesses` (type:'business') + mark _split
 *                    listing  → STAYS in `listings`; stamp type:'listing' + _split
 *                    dropped  → mark _split:'dropped' (non-African junk)
 *   CLEANUP (--cleanup): delete from `listings` every doc marked _split in
 *                        (business | dropped). Marketplace ads (listing) stay.
 *
 * The app never changes (it reads/writes `listings`, which becomes ads-only).
 * CLI: node migrate-split.js [--dry] [--cleanup] [--limit N]   Env: FIREBASE_SERVICE_ACCOUNT
 */
const admin = require('firebase-admin');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const cleanup = argv.includes('--cleanup');
const limit = Number((argv[argv.indexOf('--limit') + 1]) || 0) || 0;

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const AF = new Set(['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cape Verde','Cameroon','Central African Republic','Chad','Comoros','Congo','DR Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau',"Cote d'Ivoire",'Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe']);

// Exact source ids of the Business Directory importers (verified from the dry-run
// source distribution). Everything else with a source (Airbnb rentals, jobs,
// events, products) is marketplace content, not a directory profile.
const KNOWN_BIZ_SOURCES = new Set([
  'overture-africa-businesses', 'osm-africa-businesses', 'grid3-africa',
  'kemri-health-facilities', 'wikidata-africa', 'wikidata-africa-businesses',
  'gleif-africa', 'hipolabs-universities-africa', 'unesco-sites-africa',
  'wikivoyage-listings-africa', 'osm-diaspora-african',
]);

function isAfrican(d) {
  if (d.country && AF.has(String(d.country).trim())) return true;
  const loc = String(d.location || '');
  for (const name of AF) if (loc.includes(name)) return true;
  return d.country ? false : null; // false = known non-African; null = unknown
}
function classify(d) {
  if (d.source && KNOWN_BIZ_SOURCES.has(d.source)) return 'business'; // → businesses collection
  // Drop ONLY non-African IMPORTED junk (Airbnb/jobs feeds — they carry a source).
  // Genuine user-posted ads have NO source and are NEVER dropped, wherever they
  // are — real user content is preserved unconditionally.
  if (d.source && isAfrican(d) === false) return 'dropped';
  return 'listing';                                                   // real marketplace ad → STAYS in listings
}

async function pageThrough(fn) {
  const PAGE = 500;
  let last = null, scanned = 0;
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    await fn(snap.docs, () => scanned);
    scanned += snap.size;
    last = snap.docs[snap.docs.length - 1];
    if (limit && scanned >= limit) return scanned;
    if (snap.size < PAGE) break;
  }
  return scanned;
}

(async () => {
  if (cleanup) {
    // DELETE from `listings` everything already copied to `businesses` or dropped.
    let scanned = 0, deleted = 0, ops = 0, batch = db.batch();
    scanned = await pageThrough(async (docs) => {
      for (const doc of docs) {
        const sp = doc.data()._split;
        if (sp === 'business' || sp === 'dropped') {
          deleted++;
          if (!dry) { batch.delete(doc.ref); if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } }
        }
      }
      if (!dry && ops) { await batch.commit(); batch = db.batch(); ops = 0; }
      if (scanned % 100000 < 500) console.log(`  …deleted ${deleted}`);
    });
    console.log(`\n── CLEANUP ${dry ? '[DRY]' : '[LIVE]'} ── scanned ${scanned}, deleted-from-listings ${deleted} (marketplace ads kept)`);
    process.exit(0);
  }

  // COPY phase
  const stat = { business: 0, listing: 0, dropped: 0, already: 0 };
  const sources = {};
  const userAds = []; // genuine user-posted ads (no source) — dump for review
  let ops = 0, batch = db.batch();
  const scanned = await pageThrough(async (docs) => {
    for (const doc of docs) {
      const d = doc.data();
      if (d._split) { stat.already++; continue; }
      const t = classify(d);
      stat[t]++;
      sources[d.source || '(none)'] = (sources[d.source || '(none)'] || 0) + 1;
      if (!d.source && userAds.length < 100) {
        userAds.push(`${doc.id} | "${d.title || '(no title)'}" | ${d.location || d.country || '?'} | ${d.priceType || ''} ${d.amount ?? d.price ?? ''} ${d.currency || ''} | user:${d.userId || '?'} | → ${t}`);
      }
      if (dry) continue;
      if (t === 'business') { batch.set(db.collection('businesses').doc(doc.id), { ...d, type: 'business', migratedAt: new Date().toISOString() }, { merge: true }); ops++; }
      // stamp the source doc: type discriminator (ads staying in `listings`) + _split resume/cleanup marker
      batch.set(doc.ref, t === 'listing' ? { _split: 'listing', type: 'listing' } : { _split: t }, { merge: true });
      if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
    if (!dry && ops) { await batch.commit(); batch = db.batch(); ops = 0; }
  });
  console.log(`\n── SPLIT MIGRATION (COPY) ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(JSON.stringify({ scanned, businesses: stat.business, stays_in_listings: stat.listing, dropped: stat.dropped, already: stat.already }, null, 2));
  console.log('\n-- source distribution (top 20) --');
  Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([s, n]) => console.log(`  ${String(n).padStart(9)}  ${s}`));
  console.log(`\n-- GENUINE USER ADS (no source) — ${userAds.length} shown --`);
  userAds.forEach((s) => console.log('  ' + s));
  process.exit(0);
})().catch((e) => { console.error('migration failed:', e.message); process.exit(1); });
