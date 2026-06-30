#!/usr/bin/env node
'use strict';
/**
 * Source-quality scan (read-only over `listings`, single write to data_stats).
 *
 *   node compute-source-quality.js          # scans listings -> data_stats/source_quality
 *
 * Computes, for ACTIVE listings only:
 *   - total active listings
 *   - counts by category (categoryId)
 *   - counts by source (source)
 *   - count of NO-CONTACT listings (no phoneNumber/email/website/whatsapp/sourceUrl/url)
 *   - the list of EMPTY subcategories per the canonical taxonomy
 *     (src/config/categories.js): every (categoryId/subcategory) pair the
 *     taxonomy defines that currently has zero active listings.
 *
 * Pure reporting. Reads `listings`, writes ONLY `data_stats/source_quality`
 * with a server timestamp. Idempotent — re-running overwrites the one doc.
 *
 * Credentials follow the post-import.js pattern: CI provides creds as the
 * FIREBASE_SERVICE_ACCOUNT JSON env var; locally use
 * GOOGLE_APPLICATION_CREDENTIALS via applicationDefault().
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

/**
 * Parse the canonical taxonomy (category id -> [subcategory ids]) out of
 * src/config/categories.js without importing it (that file is an ES module).
 * We walk the CATEGORIES array text and, for each top-level `id: '...'`
 * followed by a `subCategories: [ ... ]` block, collect the nested ids.
 */
function loadTaxonomy() {
  const file = path.resolve(__dirname, '..', 'src', 'config', 'categories.js');
  const text = fs.readFileSync(file, 'utf8');
  // Isolate the CATEGORIES = [ ... ]; block so we don't pick up alias ids etc.
  const start = text.indexOf('export const CATEGORIES');
  const arrStart = text.indexOf('[', start);
  // Find the matching close bracket for the array.
  let depth = 0, end = -1;
  for (let i = arrStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const block = text.slice(arrStart, end + 1);

  // Split into per-category objects by locating each top-level category `id`.
  // A category object opens with `key:` then `id:`; subcategories live inside
  // a `subCategories: [ ... ]` sub-array. We match each subCategories array
  // and attribute it to the nearest preceding top-level `id:`.
  const taxonomy = {}; // categoryId -> Set(subIds)
  const idRe = /id:\s*'([a-z0-9-]+)'/g;
  const subBlockRe = /subCategories:\s*\[([\s\S]*?)\]/g;

  // Index every subCategories block with its position and the sub ids inside it.
  const subBlocks = [];
  let m;
  while ((m = subBlockRe.exec(block)) !== null) {
    const subIds = [];
    let sm;
    const subIdRe = /id:\s*'([a-z0-9-]+)'/g;
    while ((sm = subIdRe.exec(m[1])) !== null) subIds.push(sm[1]);
    subBlocks.push({ pos: m.index, end: m.index + m[0].length, subIds });
  }

  // Collect every `id:` occurrence; a top-level category id is one that does
  // NOT fall inside any subCategories block range.
  const catIds = [];
  while ((m = idRe.exec(block)) !== null) catIds.push({ id: m[1], pos: m.index });
  const isInSub = (pos) => subBlocks.some((b) => pos > b.pos && pos < b.end);
  const topCats = catIds.filter((c) => !isInSub(c.pos));

  for (let i = 0; i < topCats.length; i++) {
    const cat = topCats[i];
    const nextPos = i + 1 < topCats.length ? topCats[i + 1].pos : block.length;
    // The subCategories block for this cat starts between cat.pos and nextPos.
    const blk = subBlocks.find((b) => b.pos > cat.pos && b.pos < nextPos);
    taxonomy[cat.id] = new Set(blk ? blk.subIds : []);
  }
  return taxonomy;
}

const hasContact = (x) => {
  const v = (s) => typeof s === 'string' && s.trim().length > 0;
  return v(x.phoneNumber) || v(x.email) || v(x.website) || v(x.whatsapp) || v(x.sourceUrl) || v(x.url);
};

(async () => {
  const taxonomy = loadTaxonomy();
  console.log('taxonomy categories:', Object.keys(taxonomy).length);

  const byCategory = {};
  const bySource = {};
  const filledSubs = new Set(); // "categoryId/subcategory" pairs with >=1 active listing
  let total = 0;
  let noContact = 0;

  // Stream the collection so we never hold 31k docs in memory at once.
  const PAGE = 2000;
  let last = null;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').where('status', '==', 'active').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const x = d.data();
      total++;
      const cat = x.categoryId || x.category || '?';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      const src = x.source || '?';
      bySource[src] = (bySource[src] || 0) + 1;
      if (!hasContact(x)) noContact++;
      if (x.categoryId && x.subcategory) filledSubs.add(x.categoryId + '/' + x.subcategory);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  // Empty subcategories: every taxonomy (cat/sub) pair with zero active listings.
  const emptySubcategories = [];
  for (const [catId, subs] of Object.entries(taxonomy)) {
    for (const subId of subs) {
      if (!filledSubs.has(catId + '/' + subId)) {
        emptySubcategories.push(catId + '/' + subId);
      }
    }
  }
  emptySubcategories.sort();

  const byCategorySorted = Object.fromEntries(Object.entries(byCategory).sort((a, b) => b[1] - a[1]));
  const bySourceSorted = Object.fromEntries(Object.entries(bySource).sort((a, b) => b[1] - a[1]));

  const payload = {
    total,
    noContact,
    byCategory: byCategorySorted,
    bySource: bySourceSorted,
    emptySubcategories,
    emptySubcategoryCount: emptySubcategories.length,
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
    computedAtIso: new Date().toISOString(),
  };

  await db.collection('data_stats').doc('source_quality').set(payload, { merge: false });

  console.log('--- SOURCE QUALITY ---');
  console.log('total active listings :', total);
  console.log('no-contact listings   :', noContact);
  console.log('categories            :', Object.keys(byCategorySorted).length);
  console.log('sources               :', Object.keys(bySourceSorted).length);
  console.log('empty subcategories   :', emptySubcategories.length);
  console.log('written to data_stats/source_quality');
  process.exit(0);
})().catch((e) => { console.error('compute-source-quality failed:', e.message); process.exit(1); });
