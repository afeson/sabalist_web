'use strict';
/**
 * Overture Maps "Places" bulk importer (Africa).
 *
 * Reads a newline-delimited JSON file exported from Overture's public S3 parquet
 * (one place per line: {id,name,lat,lon,category,phone,website,email,locality,
 * region,country,confidence}) and runs each record through the EXISTING pipeline
 * — same dedup v2 (sourceKey/fingerprint/geo/phone/domain), diff-only skips,
 * claim-tagging, trusted-directory auto-publish, and search-index sync as the
 * OSM/Geofabrik importer. Overture Places is ~0% OSM-sourced, so cross-source
 * dedup (lib/match.js) is what keeps the catalogue clean where the same physical
 * business exists in both OSM and Overture.
 *
 * License: Overture Places is CDLA-Permissive-2.0 / Apache-2.0 (Foursquare) /
 * CC0. Commercial republishing is permitted; attribution carried in description.
 *
 * CLI: node import-overture.js --ndjson <file> [--country GH] [--dry] [--limit N]
 */
const fs = require('fs');
const readline = require('readline');
const overpass = require('./connectors/overpass');
const taxonomy = require('./lib/taxonomy');
const { runBatch } = require('./lib/pipeline');

const argv = process.argv.slice(2);
const arg = (k, def) => {
  const i = argv.indexOf(`--${k}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const ndjson = arg('ndjson');
const onlyCC = typeof arg('country') === 'string' ? String(arg('country')).toUpperCase() : null;
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
if (!ndjson) { console.error('usage: node import-overture.js --ndjson <file> [--country GH] [--dry] [--limit N]'); process.exit(1); }

// ISO-3166-1 alpha-2 -> display name (Africa). Falls back to the raw code.
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

// High-value Overture leaf categories → [Sabalist category, subcategory].
// Covers the bulk of African volume precisely; everything else falls through to
// taxonomy.categorize() keyword matching, then defaults to 'services'.
// Non-business Overture categories (natural/geographic/administrative features)
// that do NOT belong in a business directory — skipped at map time.
const SKIP_CATS = new Set([
  'river', 'stream', 'lake', 'pond', 'reservoir', 'waterfall', 'spring',
  'mountain', 'mountain_peak', 'hill', 'valley', 'cliff', 'cave', 'volcano',
  'forest', 'wood', 'beach', 'island', 'desert', 'plateau', 'natural_feature',
  'structure_and_geography', 'geographical_feature', 'bridge', 'dam', 'tunnel',
  'canal', 'bay', 'cape', 'reef', 'wetland', 'glacier', 'plain', 'dune',
]);

const OV_MAP = {
  restaurant: ['food', null], cafe: ['food', null], fast_food_restaurant: ['food', null],
  bar: ['food', null], pub: ['food', null], food_court: ['food', null], bakery: ['food', 'bakery'], grocery_store: ['food', null],
  hotel: ['travel', null], motel: ['travel', null], guest_house: ['travel', null], hostel: ['travel', null],
  resort: ['travel', null], bed_and_breakfast: ['travel', null], tourist_attraction: ['travel', 'attraction'],
  museum: ['travel', null], travel_agency: ['travel', null],
  clothing_store: ['fashion', null], shoe_store: ['fashion', 'shoes'], jewelry_store: ['fashion', 'watches-jewelry'],
  beauty_salon: ['beauty', null], hair_salon: ['beauty', 'haircare'], barber: ['beauty', 'haircare'],
  spa: ['beauty', null], nail_salon: ['beauty', null],
  mobile_phone_store: ['phones-tablets', null], electronics_store: ['electronics', null],
  computer_store: ['computers', null],
  hospital: ['services', null], clinic: ['services', null], doctor: ['services', null], pharmacy: ['services', null],
  dentist: ['services', null], veterinary: ['animals-pets', null],
  school: ['education', null], primary_school: ['education', null], secondary_school: ['education', null],
  university: ['education', null], college: ['education', null], kindergarten: ['education', null],
  bank: ['services', null], atm: ['services', null], financial_service: ['services', null],
  insurance_agency: ['services', null], real_estate_agency: ['real-estate', null],
  car_dealer: ['vehicles', 'cars'], car_repair: ['repair-services', null], car_rental: ['travel', null],
  gas_station: ['services', null], auto_parts_store: ['vehicles', 'spare-parts'],
  gym: ['sports-fitness', null], fitness_center: ['sports-fitness', null], stadium: ['sports-fitness', null],
  furniture_store: ['home-furniture', null], hardware_store: ['construction', null],
  supermarket: ['food', null], market: ['food', null], convenience_store: ['food', null],
  church: ['community', 'church'], mosque: ['community', null], place_of_worship: ['community', null],
  library: ['community', null], community_center: ['community', null],
  cinema: ['entertainment', null], night_club: ['entertainment', null],
  lawyer: ['services', null], accountant: ['services', null], consultant: ['services', null],
  religious_organization: ['community', null], shopping_center: ['services', null],
  bank_credit_union: ['services', null], health_and_medical: ['services', null],
  shopping: ['services', null], professional_services: ['services', null],
};

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const normWeb = (w) => {
  w = String(w || '').trim();
  if (!w) return '';
  return /^https?:\/\//.test(w) ? w : 'https://' + w.replace(/^\/+/, '');
};

function toRecord(o) {
  const name = o && o.name;
  if (!name) return null;
  if (o.category && SKIP_CATS.has(o.category)) return null; // non-business POI (river, mountain, …)
  const cc = (o.country || '').toUpperCase();
  const countryName = CC_NAME[cc] || cc;
  let category, subcategory;
  if (o.category && OV_MAP[o.category]) {
    [category, subcategory] = OV_MAP[o.category];
  } else {
    const raw = String(o.category || '').replace(/_/g, ' ');
    const r = taxonomy.categorize({ title: name, description: raw, rawCategory: raw });
    category = r.categoryId || 'services';
    subcategory = r.subcategory || null;
  }
  const locality = o.locality || '';
  const kind = titleCase(o.category || 'business');
  const website = normWeb(o.website);
  return {
    externalId: `overture-${o.id}`,
    title: name,
    latitude: typeof o.lat === 'number' ? o.lat : null,
    longitude: typeof o.lon === 'number' ? o.lon : null,
    description: `${kind} in ${[locality, countryName].filter(Boolean).join(', ')}. Listing sourced from Overture Maps (© Overture Maps Foundation contributors).`,
    category, subcategory,
    location: [locality, countryName].filter(Boolean).join(', '),
    country: countryName,
    phoneNumber: o.phone || '',
    website,
    email: o.email || '',
    url: website || '',
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  // Reuse the trusted-directory source contract; override identity + license.
  const src = {
    ...overpass.source,
    id: 'overture-africa-businesses',
    name: 'Overture Maps — Africa places (CDLA-Permissive/Apache/CC0)',
    license: 'Overture Maps Foundation — CDLA-Permissive-2.0 / Apache-2.0 / CC0-1.0.',
  };
  const rl = readline.createInterface({ input: fs.createReadStream(ndjson), crlfDelay: Infinity });

  const BATCH = 3000;
  let batch = [];
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };
  let read = 0, filtered = 0;

  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }
    if (onlyCC && String(o.country || '').toUpperCase() !== onlyCC) { filtered++; continue; }
    const rec = toRecord(o);
    if (!rec) continue;
    batch.push(rec);
    read++;
    if (batch.length >= BATCH) { add(await runBatch(batch, src, store, {})); batch = []; console.log(`  …${read} processed`); }
    if (limit && read >= limit) break;
  }
  if (batch.length) add(await runBatch(batch, src, store, {}));

  console.log(`\n── Overture import: ${onlyCC || 'ALL Africa'} ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  records read  : ${read}${onlyCC ? `  (skipped ${filtered} other-country)` : ''}`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('overture import failed:', e.message); process.exit(1); });
