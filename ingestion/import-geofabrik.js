#!/usr/bin/env node
'use strict';
/**
 * Geofabrik OSM bulk importer (Phase 2 / Phase 4).
 *
 * Ingests a full-country OpenStreetMap extract instead of the rate-capped
 * Overpass crawl. The workflow uses `osmium` to filter a Geofabrik <country>.osm.pbf
 * to business features and export them as GeoJSONSeq; this script streams that
 * file, maps each feature with the SAME category logic as connectors/overpass.js
 * (reused verbatim), and runs the existing pipeline — so cross-source dedup
 * (sourceKey/fingerprint), diff-only skips, claim-tagging and search-index sync
 * all apply unchanged.
 *
 *   node import-geofabrik.js --country Gambia --geojson features.geojsonseq [--dry] [--limit N]
 *
 * Uses the same source id ('osm-africa-businesses') and externalId format
 * (osm-<type>-<id>) as Overpass, so a business already imported via the crawl is
 * UPDATED, not duplicated. Env: FIREBASE_SERVICE_ACCOUNT (live) or --dry (memory).
 */
const fs = require('fs');
const readline = require('readline');
const overpass = require('./connectors/overpass');
const { runBatch } = require('./lib/pipeline');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const country = arg('country');
const geojson = arg('geojson');
const dry = !!arg('dry', false);
const limit = Number(arg('limit', 0)) || 0;
// Concurrent record processing (lib/pipeline.js opts.concurrency) — same
// speedup that carried the Overture import (~35× over serial). Large OSM
// countries (Tanzania) exceeded the 6h job cap on the serial path.
const CONC = Math.max(1, Number(arg('concurrency', 12)) || 12);
if (!country || !geojson) { console.error('Usage: node import-geofabrik.js --country <Name> --geojson <file> [--dry] [--limit N] [--concurrency N]'); process.exit(2); }

const TYPEWORD = { n: 'node', w: 'way', r: 'relation' };
const normWebsite = (w) => (/^https?:\/\//.test(w) ? w : (w ? 'https://' + w.replace(/^\/+/, '') : ''));

// Rough centroid so ways/relations (polygons) get a usable point, like Overpass `out center`.
function centroid(geom) {
  if (!geom) return null;
  if (geom.type === 'Point') return { lon: geom.coordinates[0], lat: geom.coordinates[1] };
  const flat = [];
  (function walk(a) { if (typeof a[0] === 'number') flat.push(a); else a.forEach(walk); })(geom.coordinates || []);
  if (!flat.length) return null;
  const s = flat.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return { lon: s[0] / flat.length, lat: s[1] / flat.length };
}

function toRecord(feature) {
  const p = feature.properties || {};
  const name = p.name || p['name:en'];
  if (!name) return null;
  // osmium `--add-unique-id=type_id` → @id like "n123"; fall back to feature.id.
  const raw = String(p['@id'] || feature.id || '');
  const type = TYPEWORD[raw[0]] || 'node';
  const num = raw.replace(/^[nwr]/, '');
  const [category, subcategory] = overpass.categorySubFor(p);
  const kind = overpass.titleCaseWord(p.shop || p.craft || p.tourism || p.amenity || p.office || p.healthcare || p.leisure || 'business');
  const city = p['addr:city'] || '';
  const street = p['addr:street'] ? `, ${p['addr:street']}` : '';
  const c = centroid(feature.geometry);
  return {
    externalId: `osm-${type}-${num}`,
    title: name,
    latitude: c ? c.lat : null,
    longitude: c ? c.lon : null,
    description: `${kind} in ${[city, country].filter(Boolean).join(', ')}${street}. Listing sourced from OpenStreetMap (© OpenStreetMap contributors).`,
    category, subcategory,
    location: [city, country].filter(Boolean).join(', '),
    country,
    phoneNumber: p.phone || p['contact:phone'] || p['contact:mobile'] || p.mobile || '',
    website: normWebsite(p.website || p['contact:website'] || p.url || ''),
    email: p.email || p['contact:email'] || '',
    url: `https://www.openstreetmap.org/${type}/${num}`,
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  const src = overpass.source; // reuse mapping / thresholds / business:true / ownerUserId
  const rl = readline.createInterface({ input: fs.createReadStream(geojson), crlfDelay: Infinity });

  const BATCH = 3000;
  let batch = [];
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };

  let read = 0;
  for await (const line of rl) {
    // GeoJSONSeq (RFC 8142) prefixes each record with an RS char (0x1e) — start at the first '{'.
    const brace = line.indexOf('{');
    if (brace === -1) continue;
    let rec;
    try { rec = toRecord(JSON.parse(line.slice(brace))); } catch { continue; }
    if (!rec) continue;
    batch.push(rec);
    read++;
    if (batch.length >= BATCH) { add(await runBatch(batch, src, store, { concurrency: CONC })); batch = []; console.log(`  …${read} features processed`); }
    if (limit && read >= limit) break;
  }
  if (batch.length) add(await runBatch(batch, src, store, { concurrency: CONC }));

  console.log(`\n── Geofabrik import: ${country} ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  features read : ${read}`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('geofabrik import failed:', e.message); process.exit(1); });
