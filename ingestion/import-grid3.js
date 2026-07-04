'use strict';
/**
 * GRID3 importer — official government/development POINT datasets (schools,
 * health facilities, markets) for Nigeria, DR Congo, Zambia, Sierra Leone.
 * Source: GRID3 ArcGIS Hub (services3.arcgis.com), anonymous FeatureServer query
 * API, free / CC-licensed. Non-OSM, non-Overture → genuine net-new (esp. rural
 * schools that POI datasets under-map).
 *
 * Fetches each layer as paginated GeoJSON, maps to records, and runs them through
 * the EXISTING pipeline (dedup v2 vs the whole catalogue, trusted-directory
 * auto-publish, search sync). Reuses the concurrency path added for Overture.
 *
 * CLI: node import-grid3.js [--only NG] [--dry] [--limit N] [--concurrency 16]
 */
const overpass = require('./connectors/overpass');
const { runBatch } = require('./lib/pipeline');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
const onlyCC = typeof arg('only') === 'string' ? String(arg('only')).toUpperCase() : null;
const concurrency = Math.max(1, Number(arg('concurrency', 16)) || 16);

const HOST = 'https://services3.arcgis.com/BU6Aadhn6tbBEdyk/arcgis/rest/services';
const DATASETS = [
  { svc: 'GRID3_NGA_health_facilities_v2_0', cc: 'NG', country: 'Nigeria', cat: 'services', kind: 'Health facility', name: ['facility_name'], loc: ['ward', 'lga', 'state'] },
  { svc: 'Schools_in_Nigeria', cc: 'NG', country: 'Nigeria', cat: 'education', kind: 'School', name: ['name'], loc: ['wardname', 'lganame', 'statename'] },
  { svc: 'Markets_in_Nigeria', cc: 'NG', country: 'Nigeria', cat: 'food', kind: 'Market', name: ['market_nam'], loc: ['wardname', 'lganame', 'statename'] },
  { svc: 'GRID3_COD_schools_v1_0', cc: 'CD', country: 'DR Congo', cat: 'education', kind: 'School', name: ['ecole'], loc: ['localite', 'zonesante', 'province'] },
  { svc: 'COD_GRID3_health_facilities_v8_0', cc: 'CD', country: 'DR Congo', cat: 'services', kind: 'Health facility', name: ['essnom1', 'essnom2'], loc: ['localite', 'zonesante', 'province'] },
  { svc: 'GRID3_ZMB_School_v01beta', cc: 'ZM', country: 'Zambia', cat: 'education', kind: 'School', name: ['Name', 'Orig_Name'], loc: ['District', 'Province'] },
  { svc: 'sle_htlfac_grid3_v01', cc: 'SL', country: 'Sierra Leone', cat: 'services', kind: 'Health facility', name: ['fac_name', 'facility'], loc: ['community', 'district'] },
];

const firstOf = (p, keys) => { for (const k of keys) { const v = p[k]; if (v != null && String(v).trim()) return String(v).trim(); } return ''; };

async function* fetchLayer(svc) {
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const url = `${HOST}/${svc}/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=${PAGE}`;
    let j;
    for (let attempt = 0; attempt < 4; attempt++) {
      try { const r = await fetch(url); j = await r.json(); break; }
      catch (e) { if (attempt === 3) throw e; await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); }
    }
    const feats = (j && j.features) || [];
    for (const f of feats) yield f;
    if (feats.length < PAGE) break;
    offset += PAGE;
  }
}

function toRecord(ds, f) {
  const p = (f && f.properties) || {};
  const name = firstOf(p, ds.name);
  if (!name) return null;
  let lon = null, lat = null;
  if (f.geometry && Array.isArray(f.geometry.coordinates)) { [lon, lat] = f.geometry.coordinates; }
  if (lat == null && (p.lat != null || p.LAT != null || p.latitude != null)) { lat = Number(p.lat ?? p.LAT ?? p.latitude); lon = Number(p.lon ?? p.LONG ?? p.long ?? p.longitude); }
  const id = p.globalid || p.GlobalID || p.OBJECTID || p.FID || p.uniq_id || p.grid3id || `${lon},${lat}`;
  const locality = firstOf(p, ds.loc);
  return {
    externalId: `grid3-${ds.cc}-${ds.svc}-${id}`.slice(0, 180),
    title: name,
    latitude: typeof lat === 'number' && isFinite(lat) ? lat : null,
    longitude: typeof lon === 'number' && isFinite(lon) ? lon : null,
    description: `${ds.kind} in ${[locality, ds.country].filter(Boolean).join(', ')}. Listing sourced from GRID3 (© GRID3, CC BY 4.0).`,
    category: ds.cat, subcategory: null,
    location: [locality, ds.country].filter(Boolean).join(', '),
    country: ds.country,
    phoneNumber: '', website: '', email: '', url: '',
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  const src = { ...overpass.source, id: 'grid3-africa', name: 'GRID3 — Africa schools/health/markets (CC BY 4.0)', license: 'GRID3 — CC BY 4.0.' };
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };

  for (const ds of DATASETS) {
    if (onlyCC && ds.cc !== onlyCC) continue;
    let batch = [], read = 0;
    process.stdout.write(`\n[${ds.cc}] ${ds.svc} … `);
    for await (const f of fetchLayer(ds.svc)) {
      const rec = toRecord(ds, f);
      if (!rec) continue;
      batch.push(rec); read++;
      if (batch.length >= 2000) { add(await runBatch(batch, src, store, { concurrency })); batch = []; process.stdout.write(`${read} `); }
      if (limit && read >= limit) break;
    }
    if (batch.length) add(await runBatch(batch, src, store, { concurrency }));
    console.log(`done (${read} read)`);
  }
  console.log(`\n── GRID3 import ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('grid3 import failed:', e.message); process.exit(1); });
