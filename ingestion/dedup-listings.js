'use strict';
/* Safe duplicate remover.
 *
 * Groups listings by the SAME key the audit uses (sourceKey || externalId ||
 * lowercased "title|location"). Within each group of >1, keeps the single best
 * record (most contact paths / fields / image / longest description, tie-broken
 * by oldest createdAt) and deletes the rest.
 *
 * Dry-run by default — prints what it WOULD delete. Pass --apply to delete.
 *
 *   node dedup-listings.js            # dry run
 *   node dedup-listings.js --apply    # perform deletes
 */
const admin = require('firebase-admin');
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

function dupKey(x) {
  return x.sourceKey || x.externalId || ((x.title || '') + '|' + (x.location || '')).toLowerCase();
}

// Higher score = better record to keep.
function score(x) {
  let s = 0;
  if (x.phoneNumber) s += 3;
  if (x.email) s += 3;
  if (x.website) s += 3;
  if (x.whatsapp) s += 3;
  if (x.sourceUrl || x.url) s += 2;
  if (x.coverImage || (x.images && x.images.length) || x.hasImage) s += 4;
  if (x.amount != null) s += 1;
  if (x.subcategory) s += 1;
  if (x.description) s += Math.min(3, Math.floor(String(x.description).trim().length / 40));
  if (x.location) s += 1;
  if (x.country) s += 1;
  // Non-empty field count as a final nudge.
  s += Object.values(x).filter((v) => v !== null && v !== '' && v !== undefined).length * 0.05;
  return s;
}

(async () => {
  const snap = await db.collection('listings').get();
  const groups = {};
  snap.forEach((d) => {
    const x = d.data();
    const key = dupKey(x);
    if (!key || key === '|') return;
    (groups[key] = groups[key] || []).push({ id: d.id, ref: d.ref, x });
  });

  const dupGroups = Object.entries(groups).filter(([, v]) => v.length > 1);
  let toDelete = [];
  for (const [key, members] of dupGroups) {
    members.sort((a, b) => {
      const sd = score(b.x) - score(a.x);
      if (sd !== 0) return sd;
      // tie-break: keep the OLDEST (earliest createdAt) so the stable doc survives
      return String(a.x.createdAt || '').localeCompare(String(b.x.createdAt || ''));
    });
    const keep = members[0];
    const drop = members.slice(1);
    toDelete.push(...drop.map((m) => m.ref));
    console.log(`KEY ${key} (x${members.length}) keep=${keep.id} score=${score(keep.x).toFixed(1)} drop=${drop.length}`);
  }

  console.log(`\nGroups with dups: ${dupGroups.length} | docs to delete: ${toDelete.length}`);
  if (!APPLY) { console.log('DRY RUN — re-run with --apply to delete.'); process.exit(0); }

  let n = 0, batch = db.batch(), removed = 0;
  for (const ref of toDelete) {
    batch.delete(ref); n++; removed++;
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write('.'); }
  }
  if (n > 0) await batch.commit();
  console.log(`\nDeleted ${removed} duplicate listing(s).`);
  process.exit(0);
})().catch((e) => { console.error('dedup failed:', e.message); process.exit(1); });
