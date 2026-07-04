'use strict';
/**
 * KEMRI-Wellcome / WHO health-facility importer — 98,746 public health
 * facilities across all 50 sub-Saharan countries (CC BY 4.0, updated 2025-05,
 * via HDX). Fills health coverage in the ~44 countries GRID3 doesn't reach;
 * dedup v2 absorbs overlap with GRID3/OSM/Overture facilities.
 *
 * Input: NDJSON lines {country, admin1, name, type, ownership, lat, lon}
 * (the workflow converts the HDX xlsx with a python one-liner).
 *
 * CLI: node import-kemri.js --ndjson <file> [--dry] [--limit N] [--concurrency 16]
 */
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const overpass = require('./connectors/overpass');
const { runBatch } = require('./lib/pipeline');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const ndjson = arg('ndjson');
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
const concurrency = Math.max(1, Number(arg('concurrency', 16)) || 16);
if (!ndjson) { console.error('usage: node import-kemri.js --ndjson <file> [--dry] [--limit N]'); process.exit(1); }

// Source country labels → Sabalist canonical display names.
const COUNTRY_FIX = {
  'Democratic Republic of the Congo': 'DR Congo',
  'Zanzibar': 'Tanzania',
  'eSwatini': 'Eswatini',
  'Guinea Bissau': 'Guinea-Bissau',
};

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

function toRecord(o) {
  const name = (o.name || '').trim();
  if (!name) return null;
  const country = COUNTRY_FIX[o.country] || o.country;
  const admin1 = (o.admin1 || '').trim();
  const kind = (o.type || 'Health facility').trim();
  const lat = Number(o.lat), lon = Number(o.lon);
  return {
    externalId: `kemri-${sha1(`${o.country}|${admin1}|${name}|${o.lat}|${o.lon}`)}`,
    title: name,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    description: `${kind} in ${[admin1, country].filter(Boolean).join(', ')}. Listing sourced from the KEMRI-Wellcome Trust / WHO public health facility database (CC BY 4.0).`,
    category: 'services', subcategory: null,
    location: [admin1, country].filter(Boolean).join(', '),
    country,
    phoneNumber: '', website: '', email: '', url: '',
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  const src = {
    ...overpass.source,
    id: 'kemri-health-facilities',
    name: 'KEMRI-Wellcome / WHO — sub-Saharan public health facilities (CC BY 4.0)',
    license: 'KEMRI-Wellcome Trust / WHO — CC BY 4.0.',
  };
  const rl = readline.createInterface({ input: fs.createReadStream(ndjson), crlfDelay: Infinity });
  const BATCH = 3000;
  let batch = [], read = 0;
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };

  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let o; try { o = JSON.parse(t); } catch { continue; }
    const rec = toRecord(o);
    if (!rec) continue;
    batch.push(rec); read++;
    if (batch.length >= BATCH) { add(await runBatch(batch, src, store, { concurrency })); batch = []; console.log(`  …${read} processed`); }
    if (limit && read >= limit) break;
  }
  if (batch.length) add(await runBatch(batch, src, store, { concurrency }));

  console.log(`\n── KEMRI health-facility import ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  records read  : ${read}`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('kemri import failed:', e.message); process.exit(1); });
