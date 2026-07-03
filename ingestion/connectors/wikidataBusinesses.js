'use strict';
/**
 * Wikidata businesses connector (CODE connector, load() hook).
 *
 * A SECOND legal public source alongside OpenStreetMap: notable companies,
 * banks, hotels, restaurants, retailers and brands headquartered/located in
 * African countries, from Wikidata's SPARQL endpoint. Wikidata is CC0 (public
 * domain) — no attribution required, but we keep the entity URL as sourceUrl.
 *
 * Queries per country (bounded LIMIT, polite rate-limit, per-country failures
 * non-fatal) to stay under Wikidata's 60s query cap. Flows through the SAME
 * pipeline as OSM: dedup by fingerprint (a company already imported from OSM in
 * the same city/category is caught as a duplicate → review, never double
 * published), claim-tagging (business:true), and AI enrichment downstream.
 */
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'SabalistBot/1.0 (https://sabalist.com; listings@sabalist.com) ingestion';
const PER_COUNTRY = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Major African economies with meaningful Wikidata business coverage. QID →
// Sabalist country name (must match ingestion/lib/geo.js). Small states have
// negligible Wikidata business data, so we skip them (OSM covers all 54).
const COUNTRY_QIDS = {
  Q1033: 'Nigeria', Q114: 'Kenya', Q258: 'South Africa', Q79: 'Egypt', Q117: 'Ghana',
  Q1028: 'Morocco', Q115: 'Ethiopia', Q924: 'Tanzania', Q1036: 'Uganda', Q262: 'Algeria',
  Q948: 'Tunisia', Q916: 'Angola', Q1041: 'Senegal', Q1008: "Cote d'Ivoire", Q1009: 'Cameroon',
  Q954: 'Zimbabwe', Q953: 'Zambia', Q974: 'DR Congo', Q1037: 'Rwanda', Q1029: 'Mozambique',
  Q963: 'Botswana', Q1030: 'Namibia', Q1016: 'Libya', Q1049: 'Sudan', Q1027: 'Mauritius',
  Q1020: 'Malawi', Q967: 'Burundi', Q1006: 'Guinea', Q1000: 'Gabon', Q962: 'Benin',
};

// Wikidata instance-of (P31) QID → [Sabalist category, subcategory].
const TYPE_MAP = {
  Q11707: ['food', 'restaurants'],      // restaurant
  Q27686: ['travel', 'hotels'],         // hotel
  Q22687: ['services', null],           // bank
  Q180846: ['food', 'groceries'],       // supermarket
  Q507619: ['food', 'groceries'],       // retail chain
  Q431289: ['services', null],          // brand
  Q4830453: ['business-industrial', null], // business
  Q783794: ['business-industrial', null],  // company
  Q6881511: ['business-industrial', null], // enterprise
  Q43229: ['services', null],           // organization
};
const TYPES = Object.keys(TYPE_MAP).map((q) => `wd:${q}`).join(' ');

function query(qid) {
  return `SELECT ?item ?itemLabel ?itemDescription ?type ?website ?placeLabel ?coord WHERE {
  VALUES ?type { ${TYPES} }
  ?item wdt:P31 ?type ; wdt:P17 wd:${qid} ; wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item wdt:P131 ?place. ?place rdfs:label ?placeLabel FILTER(LANG(?placeLabel)='en'). }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT ${PER_COUNTRY}`;
}

const qidOf = (uri) => String(uri || '').split('/').pop();
const typeCat = (typeUri) => TYPE_MAP[qidOf(typeUri)] || ['business-industrial', null];
// WKT literal from P625 is "Point(lon lat)".
function parsePoint(wkt) {
  const m = /Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(String(wkt || ''));
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}

module.exports = {
  source: {
    id: 'wikidata-africa-businesses',
    name: 'Wikidata — African businesses/companies/hotels/banks (SPARQL, CC0)',
    enabled: true,
    business: true, // claimable businesses (→ /claim + AI Assistant)
    trustedDirectory: true, // curated open data (CC0) — auto-publish valid non-dup entries
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'Wikidata (CC0 1.0, public domain). Entity URL kept as sourceUrl.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', subcategory: 'subcategory', location: 'location', country: 'country',
      website: 'website', url: 'url', priceType: { const: 'none' },
      latitude: 'latitude', longitude: 'longitude',
    },

    async load({ httpRequest, opts }) {
      const out = [];
      for (const [qid, country] of Object.entries(COUNTRY_QIDS)) {
        try {
          const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query(qid))}`;
          const raw = await httpRequest(url, { method: 'GET', headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } });
          const rows = (JSON.parse(raw).results && JSON.parse(raw).results.bindings) || [];
          for (const r of rows) {
            const label = r.itemLabel && r.itemLabel.value;
            const itemQid = qidOf(r.item && r.item.value);
            // Skip entities with no real English label (label falls back to the Q-id).
            if (!label || /^Q\d+$/.test(label)) continue;
            const [category, subcategory] = typeCat(r.type && r.type.value);
            const place = r.placeLabel && r.placeLabel.value;
            const desc = (r.itemDescription && r.itemDescription.value) || `${label} in ${place ? place + ', ' : ''}${country}.`;
            const pt = parsePoint(r.coord && r.coord.value);
            out.push({
              externalId: `wd-${itemQid}`,
              title: label,
              latitude: pt ? pt.lat : null,
              longitude: pt ? pt.lon : null,
              description: desc,
              category,
              subcategory,
              location: `${place ? place + ', ' : ''}${country}`,
              country,
              website: (r.website && r.website.value) || '',
              url: r.item && r.item.value, // Wikidata entity URL
            });
          }
        } catch (e) {
          // per-country failure (timeout/rate limit) is non-fatal; keep going
        }
        await sleep(1500); // polite to WDQS
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
