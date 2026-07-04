'use strict';
/**
 * Wikidata organization/facility importer (CC0 — fully free, no attribution
 * required). Pulls African orgs WITH coordinates via SPARQL, sharded by country
 * (and by type when a country query risks the 60s WDQS timeout). Captures
 * multilingual labels (en/fr/ar/pt/sw/am) as aliases → seeds Phase 8, and
 * phone/website (P1329/P856) → seeds Phase 9. Runs through the existing dedup
 * pipeline so overlap with OSM/Overture is merged automatically.
 *
 * CLI: node import-wikidata.js [--only Q1033] [--dry] [--limit N] [--concurrency 12]
 */
const overpass = require('./connectors/overpass');
const { runBatch } = require('./lib/pipeline');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
const onlyQ = typeof arg('only') === 'string' ? String(arg('only')) : null;
const concurrency = Math.max(1, Number(arg('concurrency', 12)) || 12);

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'sabalist-ingest/1.0 (https://sabalist.com; afesonabebe@yahoo.com)';

// African countries: Wikidata Q-id → Sabalist display name.
const COUNTRIES = {
  Q1033: 'Nigeria', Q79: 'Egypt', Q258: 'South Africa', Q114: 'Kenya', Q115: 'Ethiopia',
  Q117: 'Ghana', Q1028: 'Morocco', Q262: 'Algeria', Q948: 'Tunisia', Q924: 'Tanzania',
  Q1036: 'Uganda', Q916: 'Angola', Q1029: 'Mozambique', Q1019: 'Madagascar', Q1009: 'Cameroon',
  Q1008: "Cote d'Ivoire", Q1032: 'Niger', Q965: 'Burkina Faso', Q912: 'Mali', Q1020: 'Malawi',
  Q953: 'Zambia', Q954: 'Zimbabwe', Q1041: 'Senegal', Q657: 'Chad', Q1045: 'Somalia',
  Q1006: 'Guinea', Q962: 'Benin', Q967: 'Burundi', Q1037: 'Rwanda', Q945: 'Togo',
  Q1044: 'Sierra Leone', Q1016: 'Libya', Q1014: 'Liberia', Q929: 'Central African Republic',
  Q1025: 'Mauritania', Q986: 'Eritrea', Q1005: 'Gambia', Q963: 'Botswana', Q1030: 'Namibia',
  Q1000: 'Gabon', Q1013: 'Lesotho', Q1007: 'Guinea-Bissau', Q983: 'Equatorial Guinea',
  Q1027: 'Mauritius', Q1050: 'Eswatini', Q977: 'Djibouti', Q970: 'Comoros', Q1011: 'Cape Verde',
  Q1039: 'Sao Tome and Principe', Q1042: 'Seychelles', Q974: 'DR Congo', Q971: 'Congo',
  Q1049: 'Sudan', Q958: 'South Sudan',
};

// Wikidata instance-of (P31) type → [Sabalist category, subcategory].
const TYPE_CAT = {
  Q16917: ['services', null],        // hospital
  Q4287745: ['services', null],      // medical facility
  Q3918: ['education', null],        // university
  Q3914: ['education', null],        // school
  Q189004: ['education', null],      // college
  Q9842: ['education', null],        // primary school
  Q159334: ['education', null],      // secondary school
  Q33506: ['travel', null],          // museum
  Q7075: ['community', null],        // library
  Q1248784: ['travel', null],        // airport
  Q44782: ['services', null],        // port
  Q4830453: ['services', null],      // business enterprise
  Q783794: ['services', null],       // company
  Q327333: ['services', null],       // government agency
  Q22687: ['services', null],        // bank
  Q79913: ['community', null],       // NGO
  Q3917: ['services', null],         // embassy
  Q48204: ['community', null],       // association / voluntary org
  Q431289: ['services', null],       // brand
  Q11707: ['food', null],            // restaurant
  Q27686: ['travel', null],          // hotel
  Q483110: ['sports-fitness', null], // stadium
  Q41176: ['real-estate', null],     // building
  Q13226383: ['travel', null],       // facility
  Q234460: ['community', null],      // place of worship (generic)
  Q16970: ['community', 'church'],   // church building
  Q32815: ['community', null],       // mosque
};
const TYPE_QIDS = Object.keys(TYPE_CAT).map((q) => `wd:${q}`).join(' ');

const LANGS = ['en', 'fr', 'ar', 'pt', 'sw', 'am'];

function sparql(countryQ, typeQids) {
  const optLabels = LANGS.map((l) => `OPTIONAL { ?item rdfs:label ?${l} FILTER(lang(?${l})="${l}") }`).join('\n  ');
  return `SELECT ?item ?coord ?type ${LANGS.map((l) => '?' + l).join(' ')} ?phone ?website WHERE {
  VALUES ?type { ${typeQids} }
  ?item wdt:P17 wd:${countryQ} ; wdt:P625 ?coord ; wdt:P31 ?type .
  ${optLabels}
  OPTIONAL { ?item wdt:P1329 ?phone }
  OPTIONAL { ?item wdt:P856 ?website }
}`;
}

async function runQuery(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
      });
      if (res.status === 429 || res.status >= 500) throw new Error('retry ' + res.status);
      if (!res.ok) return null;
      return (await res.json()).results.bindings;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

// Fetch a country; if the combined query fails/times out, shard by single type.
async function fetchCountry(countryQ) {
  try {
    const rows = await runQuery(sparql(countryQ, TYPE_QIDS));
    if (rows) return rows;
  } catch { /* fall through to per-type sharding */ }
  const all = [];
  for (const q of Object.keys(TYPE_CAT)) {
    try { const r = await runQuery(sparql(countryQ, `wd:${q}`)); if (r) all.push(...r); }
    catch { /* skip this type */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return all;
}

function toRecord(row, country) {
  const label = LANGS.map((l) => row[l]?.value).find(Boolean);
  if (!label) return null;
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord?.value || '');
  const lon = m ? Number(m[1]) : null, lat = m ? Number(m[2]) : null;
  const [category, subcategory] = TYPE_CAT[(row.type?.value || '').split('/').pop()] || ['services', null];
  const aliases = [...new Set(LANGS.map((l) => row[l]?.value).filter((v) => v && v !== label))];
  const qid = (row.item?.value || '').split('/').pop();
  const website = row.website?.value || '';
  return {
    externalId: `wikidata-${qid}`,
    title: label,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    description: `Organization in ${country}. Listing sourced from Wikidata (CC0).`,
    category, subcategory,
    location: country,
    country,
    phoneNumber: row.phone?.value || '',
    website: website && /^https?:\/\//.test(website) ? website : '',
    email: '', url: `https://www.wikidata.org/wiki/${qid}`,
    aliases, // multilingual — folded into search in Phase 8
  };
}

(async () => {
  const store = dry ? require('./lib/storeMemory').createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  const src = { ...overpass.source, id: 'wikidata-africa', name: 'Wikidata — African organizations (CC0)', license: 'Wikidata — CC0 1.0 (public domain).' };
  const totals = { total: 0, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0 };
  const add = (s) => { for (const k of Object.keys(totals)) totals[k] += s[k] || 0; };
  let grandRead = 0;

  const entries = Object.entries(COUNTRIES).filter(([q]) => !onlyQ || q === onlyQ);
  for (const [countryQ, country] of entries) {
    process.stdout.write(`\n[${country}] querying… `);
    let rows;
    try { rows = await fetchCountry(countryQ); } catch (e) { console.log(`FAILED: ${e.message}`); continue; }
    const recs = [];
    for (const row of rows || []) { const r = toRecord(row, country); if (r) recs.push(r); if (limit && recs.length >= limit) break; }
    process.stdout.write(`${recs.length} orgs → `);
    for (let i = 0; i < recs.length; i += 3000) add(await runBatch(recs.slice(i, i + 3000), src, store, { concurrency }));
    grandRead += recs.length;
    console.log('done');
    await new Promise((r) => setTimeout(r, 600)); // be polite to WDQS
    if (limit && grandRead >= limit) break;
  }

  console.log(`\n── Wikidata import ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(`  orgs read : ${grandRead}`);
  console.log(`  published: ${totals.published}  updated: ${totals.updated}  skipped: ${totals.skipped}  review: ${totals.review}  rejected: ${totals.rejected}`);
  process.exit(0);
})().catch((e) => { console.error('wikidata import failed:', e.message); process.exit(1); });
