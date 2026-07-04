#!/usr/bin/env node
'use strict';
/**
 * Full Firestore → Meilisearch sync (the durable 10M-scale engine).
 * Env-gated: needs MEILISEARCH_URL + MEILISEARCH_ADMIN_KEY (plus
 * FIREBASE_SERVICE_ACCOUNT). Documents are stored WHOLE in the index so
 * /api/search serves hits with zero Firestore reads.
 *
 * Safe to re-run any time: documents upsert by id; the index is a disposable
 * projection of Firestore (the source of truth).
 */
const admin = require('firebase-admin');

const URL = (process.env.MEILISEARCH_URL || '').replace(/\/$/, '');
const KEY = process.env.MEILISEARCH_ADMIN_KEY || '';
const INDEX = process.env.MEILISEARCH_INDEX || 'listings';
if (!URL || !KEY) { console.error('MEILISEARCH_URL / MEILISEARCH_ADMIN_KEY not set'); process.exit(1); }

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` };

async function meili(path, method = 'GET', body) {
  const res = await fetch(`${URL}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function toDoc(id, x) {
  const city = x.city || String(x.location || '').split(',')[0].trim();
  return {
    id,
    title: x.title || '',
    categoryId: x.categoryId || '',
    subcategory: x.subcategory || '',
    city,
    country: x.country || '',
    location: x.location || '',
    latitude: typeof x.latitude === 'number' ? x.latitude : null,
    longitude: typeof x.longitude === 'number' ? x.longitude : null,
    // Meilisearch geo needs _geo: {lat, lng}
    ...(typeof x.latitude === 'number' && typeof x.longitude === 'number'
      ? { _geo: { lat: x.latitude, lng: x.longitude } } : {}),
    quality_score: x.qualityScore ?? x.quality_score ?? 0,
    thumbnail: x.coverImage || (Array.isArray(x.images) && x.images[0]) || null,
    keywords: Array.isArray(x.searchKeywords) ? x.searchKeywords : [],
    status: x.status || 'active',
  };
}

(async () => {
  // 1) Ensure index + settings (idempotent).
  await meili('/indexes', 'POST', { uid: INDEX, primaryKey: 'id' }).catch(() => {});
  await meili(`/indexes/${INDEX}/settings`, 'PATCH', {
    searchableAttributes: ['title', 'keywords', 'categoryId', 'subcategory', 'city', 'country', 'location'],
    filterableAttributes: ['status', 'country', 'city', 'categoryId', 'subcategory', '_geo'],
    sortableAttributes: ['quality_score', '_geo'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'quality_score:desc'],
    pagination: { maxTotalHits: 5000 },
  });

  // 2) Stream Firestore → batched document upserts.
  const PAGE = 2000, PUSH = 10000;
  let last = null, scanned = 0, pushed = 0, buf = [];
  const flush = async () => {
    if (!buf.length) return;
    await meili(`/indexes/${INDEX}/documents`, 'POST', buf);
    pushed += buf.length; buf = [];
  };
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const x = d.data();
      scanned++;
      if ((x.status || 'active') !== 'active') continue;
      buf.push(toDoc(d.id, x));
      if (buf.length >= PUSH) await flush();
    }
    last = snap.docs[snap.docs.length - 1];
    if (scanned % 100000 < PAGE) console.log(`  …scanned ${scanned}, pushed ${pushed}`);
    if (snap.size < PAGE) break;
  }
  await flush();
  console.log('--- MEILISEARCH SYNC ---');
  console.log(JSON.stringify({ scanned, pushed, index: INDEX }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('meili sync failed:', e.message); process.exit(1); });
