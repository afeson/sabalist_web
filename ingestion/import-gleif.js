'use strict';
/**
 * GLEIF importer — Global Legal Entity Identifier data (CC0, public domain,
 * fully redistributable, zero attribution required). Pulls all African legal
 * entities via the GLEIF API, sharded by country. Fields: legal name + city/
 * region/country + status. No coordinates/phone/website (LEI data is registry-
 * grade). Small but clean net-new (formal financial/corporate entities largely
 * absent from OSM/Overture). Runs through the existing dedup pipeline.
 *
 * CLI: node import-gleif.js [--only ZA] [--dry] [--limit N] [--concurrency 12]
 */
const overpass = require('./connectors/overpass');
const { runBatch } = require('./lib/pipeline');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
const onlyCC = typeof arg('only') === 'string' ? String(arg('only')).toUpperCase() : null;
const concurrency = Math.max(1, Number(arg('concurrency', 12)) || 12);

const UA = 'sabalist-ingest/1.0 (https://sabalist.com; afesonabebe@yahoo.com)';
const API = 'https://api.gleif.org/api/v1/lei-records';

// African ISO-3166-1 alpha-2 → display name (all 54).
const CC_NAME = {
  DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi',
  CV: 'Cape Verde', CM: 'Cameroon', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros',
  CG: 'Congo', CD: 'DR Congo', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  SZ: 'Eswatini', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia', GH: 'Ghana', GN: 'Guinea',
  GW: 'Guinea-Bissau', CI: "Cote d'Ivoire", KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya',
  MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', MA: 'Morocco',
  MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RW: 'Rwanda', ST: 'Sao Tome and Principe',
  SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa',
  SS: 'South Sudan', SD: 'Sudan', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda',
  ZM: 'Zambia', ZW: 'Zimbabwe',
};

async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/vnd.api+json' } });
      if (res.status === 429 || res.status >= 500) throw new Error('retry ' + res.status);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { if (attempt === 3) throw e; await new Promise((r) => setTimeout(r, 2500 * (attempt + 1))); }
  }
}

async function* fetchCountry(cc) {
  const SIZE = 200;
  let page = 1;
  while (true) {
    const url = `${API}?filter%5Bentity.legalAddress.country%5D=${cc}&page%5Bsize%5D=${SIZE}&page%5Bnumber%5D=${page}`;
    const j = await fetchJson(url);
    const rows = (j && j.data) || [];
    for (const r of rows) yield r;
    if (rows.length < SIZE) break;
    page++;
  }
}

function toRecord(r, country) {
  const e = (r.attributes && r.attributes.entity) || {};
  const name = e.legalName && e.legalName.name;
  if (!name) return null;
  if (e.status && e.status !== 'ACTIVE') return null; // skip lapsed/retired entities
  const a = e.legalAddress || {};
  const city = a.city || '';
  const region = a.region || '';
  const lei = r.id || (r.attributes && r.attributes.lei) || '';
  return {
    externalId: `gleif-${lei}`,
    title: name,
    latitude: null, longitude: null,
    description: `Registered legal entity in ${[city, country].filter(Boolean).join(', ')}. Listing sourced from GLEIF (Global Legal Entity Identifier, CC0 public domain).`,
    category: 'services', subcategory: null,
    location: [city, country].filter(Boolean).join(', '),
    country,
    phoneNumber: '', website: '', email: '', url: `https://search.gleif.org/#/record/${lei}`,
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  const src = { ...overpass.source, id: 'gleif-africa', name: 'GLEIF — African legal entities (CC0)', license: 'GLEIF — CC0 1.0 (public domain).' };
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };
  let grand = 0;

  for (const cc of Object.keys(CC_NAME)) {
    if (onlyCC && cc !== onlyCC) continue;
    const country = CC_NAME[cc];
    process.stdout.write(`[${cc} ${country}] `);
    let batch = [], read = 0;
    for await (const r of fetchCountry(cc)) {
      const rec = toRecord(r, country);
      if (!rec) continue;
      batch.push(rec); read++;
      if (batch.length >= 1000) { add(await runBatch(batch, src, store, { concurrency })); batch = []; }
      if (limit && read >= limit) break;
    }
    if (batch.length) add(await runBatch(batch, src, store, { concurrency }));
    grand += read;
    console.log(`${read}`);
    if (limit && grand >= limit) break;
  }
  console.log(`\n── GLEIF import ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  entities read : ${grand}`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('gleif import failed:', e.message); process.exit(1); });
