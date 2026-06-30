'use strict';
/* Back-office contact enrichment for OSM listings: re-queries Overpass for the
   exact OSM elements we already imported (by id) and backfills phone / website /
   email that the original crawl didn't capture. No re-crawl of cities, no
   pipeline — direct, idempotent updates. */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const { httpRequest } = require('./lib/fetcher');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const BATCH = 220;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const phoneOf = (t) => (t.phone || t['contact:phone'] || t['contact:mobile'] || t.mobile || '').trim();
const webOf = (t) => { const w = t.website || t['contact:website'] || t.url || ''; return /^https?:\/\//.test(w) ? w : (w ? 'https://' + w.replace(/^\/+/, '') : ''); };
const emailOf = (t) => (t.email || t['contact:email'] || '').trim();

async function fetchTags(type, ids) {
  const q = `[out:json][timeout:120];${type}(id:${ids.join(',')});out tags;`;
  const raw = await httpRequest(OVERPASS, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(q)}` });
  return (JSON.parse(raw).elements) || [];
}

(async () => {
  const snap = await db.collection('listings').get();
  const osm = [];
  snap.forEach((d) => { const x = d.data(); if ((x.source || '').startsWith('osm-')) { const m = (x.sourceUrl || x.url || '').match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/); if (m) osm.push({ ref: d.ref, type: m[1], id: m[2], hasPhone: !!(x.phoneNumber && String(x.phoneNumber).trim()) }); } });
  console.log('OSM listings to enrich:', osm.length);

  // group ids by type
  const byType = { node: [], way: [], relation: [] };
  const refByKey = new Map();
  for (const o of osm) { byType[o.type].push(o.id); refByKey.set(o.type + '-' + o.id, o.ref); }

  const contact = new Map(); // type-id -> {phone, website, email}
  for (const type of ['node', 'way', 'relation']) {
    const ids = byType[type];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      try {
        const els = await fetchTags(type, chunk);
        for (const el of els) { const t = el.tags || {}; const ph = phoneOf(t), web = webOf(t), em = emailOf(t); if (ph || web || em) contact.set(type + '-' + el.id, { phone: ph, website: web, email: em }); }
      } catch (e) { process.stdout.write('x'); }
      process.stdout.write('.');
      await sleep(1100); // be polite to Overpass
    }
  }
  console.log('\nelements with some contact:', contact.size);

  // write updates
  let batch = db.batch(), n = 0, updated = 0, addedPhone = 0, addedWeb = 0, addedEmail = 0;
  for (const [key, c] of contact) {
    const ref = refByKey.get(key); if (!ref) continue;
    const patch = {};
    if (c.phone) { patch.phoneNumber = c.phone; addedPhone++; }
    if (c.website) { patch.website = c.website; addedWeb++; }
    if (c.email) { patch.email = c.email; addedEmail++; }
    if (!Object.keys(patch).length) continue;
    batch.set(ref, patch, { merge: true }); n++; updated++;
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) await batch.commit();
  console.log(`enriched ${updated} OSM listings — phone +${addedPhone}, website +${addedWeb}, email +${addedEmail}`);
  process.exit(0);
})().catch((e) => { console.error('enrich failed:', e.message); process.exit(1); });
