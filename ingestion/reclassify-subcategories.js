#!/usr/bin/env node
'use strict';
/**
 * PART 1 — SAFE SUBCATEGORY-ONLY refinement of existing listings.
 *
 * Refines ONLY the `subcategory` field to a more specific EXISTING subcategory
 * when the listing TITLE clearly matches one (taxonomy SUB_RULES, catch-all
 * excluded). It NEVER:
 *   - changes the top-level categoryId
 *   - creates/renames/merges/deletes any category or subcategory
 *   - moves a listing between top-level categories
 *
 * Safety:
 *   - genuine USER listings (no `source`) are SKIPPED (protected)
 *   - docs whose categoryId is not a known category are left untouched (flagged)
 *   - the proposed subcategory is always a VALID sub of the current category
 *
 * DRY_RUN=true (default) reports only; DRY_RUN=false writes.
 * Env: FIREBASE_SERVICE_ACCOUNT. Touches ONLY `subcategory`.
 */
const admin = require('firebase-admin');
const { SUB_RULES, CATEGORY_IDS, VALID_SUBS } = require('./lib/taxonomy');

const DRY = process.env.DRY_RUN !== 'false';
const norm = (s) => String(s || '').toLowerCase().trim();

// A SPECIFIC subcategory match from the title (never the catch-all `/./` rule).
function specificSub(cat, t) {
  const rules = SUB_RULES[cat];
  if (!rules) return null;
  for (const [re, sub] of rules) {
    if (re.source === '.' || re.source === '(?:)') continue; // skip catch-all
    if (re.test(t)) return sub;
  }
  return null;
}

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

(async () => {
  const PAGE = 1000;
  let last = null, scanned = 0, changed = 0, skippedUser = 0, flagged = 0;
  const changes = {}; // "cat: old -> new": count
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
      const cur = x.categoryId || '';
      const curSub = x.subcategory || '';
      if (!CATEGORY_IDS.has(cur)) { flagged++; continue; }              // invalid category → leave for manual review
      if (!String(x.source || '').trim()) { skippedUser++; continue; }  // genuine user listing → protected
      const ns = specificSub(cur, norm(x.title));
      if (!ns || ns === curSub) continue;                               // no better specific sub
      if (!(VALID_SUBS[cur] && VALID_SUBS[cur].has(ns))) continue;      // safety: must be a valid existing sub
      const key = `${cur}: ${curSub || '(none)'} -> ${ns}`;
      changes[key] = (changes[key] || 0) + 1;
      changed++;
      if (!DRY) {
        batch.update(d.ref, { subcategory: ns });
        n++;
        if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
      }
    }
    if (!DRY && n) await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  console.log(`--- RECLASSIFY SUBCATEGORIES (${DRY ? 'DRY-RUN — nothing written' : 'APPLIED — written'}) ---`);
  console.log(JSON.stringify({
    scanned,
    subcategoryRefinements: changed,
    skippedUserListings: skippedUser,
    flaggedInvalidCategory: flagged,
  }, null, 2));
  console.log('changes by category/subcategory:');
  Object.entries(changes).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  process.exit(0);
})().catch((e) => { console.error('reclassify failed:', e.message); process.exit(1); });
