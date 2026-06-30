'use strict';
/**
 * UNESCO World Heritage Sites connector (CODE connector, load() hook).
 *
 * Fills the Travel category (sub: tours — "Tours & Safaris") with REAL African
 * World Heritage Sites: national parks, ancient cities, rock-art landscapes,
 * cultural and natural wonders that travellers visit. Each listing carries a
 * genuine contact path — the official whc.unesco.org/en/list/{id} page, which is
 * always present and is where a traveller reads the site's location, history and
 * how to plan a visit. That satisfies the "every listing must be reachable" rule.
 *
 * Source: UNESCO's official World Heritage List, published as a CSV on UNESCO's
 * IHP-WINS open-data portal (the same data as whc.unesco.org/en/list, but on a
 * host that serves machine clients — the main site is behind a bot wall):
 *   https://ihp-wins.unesco.org/dataset/unesco-world-heritage-sites
 * Data © UNESCO; reused here with attribution. We import only sites located in an
 * African state party (filtered by ISO-2 country code) and never synthesize data
 * — every field comes straight from the official record.
 *
 * Each row provides: id_no, site name + short description, inscribing state(s),
 * category (Cultural / Natural / Mixed), inscription year, criteria, and
 * lat/longitude. The official list-page URL and the canonical site photo are both
 * derived from the stable id_no (whc.unesco.org/en/list/{id} and
 * whc.unesco.org/uploads/sites/site_{id}.jpg).
 *
 * These are evergreen destinations (the listing is the landmark, not a dated
 * event), so they stay relevant year-round. All map to travel / tours.
 */
const CSV_URL =
  'https://ihp-wins.unesco.org/dataset/88c8eff6-b94d-4826-bb13-7107ac4c02a9/resource/' +
  '2f46f6b2-45f9-402b-ace9-1e02c9c97a3d/download/whc-sites-2025.csv';
const UA = 'Sabalist-data/1.0 (https://sabalist.com; afesonabebe@yahoo.com)';

// African country ISO-2 codes (lowercase). Keeps only sites in an African state
// party. Covers Sub-Saharan Africa AND the North African states UNESCO files
// under "Arab States" (Algeria, Egypt, Libya, Morocco, Sudan, Tunisia, Western
// Sahara) — geographically African. Middle-Eastern Arab states are excluded.
const AFRICA_ISO = new Set([
  'dz', 'ao', 'bj', 'bw', 'bf', 'bi', 'cv', 'cm', 'cf', 'td', 'km', 'cg', 'cd',
  'ci', 'dj', 'eg', 'gq', 'er', 'sz', 'et', 'ga', 'gm', 'gh', 'gn', 'gw', 'ke',
  'ls', 'lr', 'ly', 'mg', 'mw', 'ml', 'mr', 'mu', 'ma', 'mz', 'na', 'ne', 'ng',
  'rw', 'st', 'sn', 'sc', 'sl', 'so', 'za', 'ss', 'sd', 'tz', 'tg', 'tn', 'ug',
  'zm', 'zw', 'eh',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal RFC-4180 CSV parser (fields may be quoted and contain commas/newlines).
function parseCSV(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const Q = '"';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === Q) {
        if (text[i + 1] === Q) { field += Q; i++; } // escaped quote
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === Q) { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  source: {
    id: 'unesco-sites-africa',
    name: 'UNESCO World Heritage Sites — Africa (official list, CSV)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license:
      'UNESCO World Heritage Centre — official World Heritage List (https://whc.unesco.org/en/list/), ' +
      'via the UNESCO IHP-WINS open-data portal. Imported with attribution to UNESCO. ' +
      'The official list page (whc.unesco.org/en/list/{id}) is used as the contact path.',
    // Explicit travel category + a high-quality contact (the official page URL)
    // means high confidence; keep the publish bar reachable.
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId',
      title: 'title',
      description: 'description',
      category: 'category',
      subcategory: 'subcategory',
      country: 'country',
      location: 'location',
      website: 'website',
      url: 'url',
      contact: 'contact',
      images: 'images',
      coverImage: 'coverImage',
      priceType: { const: 'none' },
    },

    async load({ httpRequest }) {
      const csv = await httpRequest(CSV_URL, {
        headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
      });
      const rows = parseCSV(csv);
      if (!rows.length) return [];
      const header = rows[0].map((h, i) => (i === 0 ? h.replace(/^﻿/, '') : h));
      const idx = Object.fromEntries(header.map((h, i) => [h, i]));
      const need = ['id_no', 'name_en', 'iso_code', 'states_name_en'];
      if (need.some((k) => !(k in idx))) {
        throw new Error(`UNESCO CSV header changed: missing ${need.filter((k) => !(k in idx)).join(', ')}`);
      }

      const out = [];
      const seen = new Set();
      for (const r of rows.slice(1)) {
        const id = (r[idx.id_no] || '').trim();
        const name = stripHtml(r[idx.name_en] || '');
        if (!id || !name || seen.has(id)) continue;

        const isos = (r[idx.iso_code] || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        if (!isos.some((c) => AFRICA_ISO.has(c))) continue;
        seen.add(id);

        const states = stripHtml(r[idx.states_name_en] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const country = states[0] || '';
        const where = states.length > 1 ? states.join(', ') : country;
        const catShort = (r[idx.category_short] || '').trim(); // C / N / M
        const catLong =
          { C: 'Cultural', N: 'Natural', M: 'Mixed' }[catShort] ||
          stripHtml(r[idx.category] || '');
        const year = (r[idx.date_inscribed] || '').trim();
        const blurb = stripHtml(r[idx.short_description_en] || '');

        // Stable, official derivations from the inscription id.
        const pageUrl = `https://whc.unesco.org/en/list/${id}`;
        const image = `https://whc.unesco.org/uploads/sites/site_${id}.jpg`;

        const typeLabel = catLong ? `${catLong} World Heritage Site` : 'UNESCO World Heritage Site';
        const inscribed = year ? ` Inscribed by UNESCO in ${year}.` : '';
        const description =
          `${name} — ${typeLabel} in ${where || 'Africa'}.` +
          (blurb ? ` ${blurb}` : '') +
          `${inscribed} Plan a visit, location and history via the official UNESCO page. ` +
          `Source: UNESCO World Heritage Centre.`;

        out.push({
          externalId: `unesco-${id}`,
          title: name,
          category: 'travel',
          subcategory: 'tours', // Africa's heritage sites are tours/safaris destinations
          country,
          location: where || country || 'Africa',
          website: pageUrl,
          url: pageUrl,
          contact: pageUrl, // contact path = official whc.unesco.org list page
          images: [image],
          coverImage: image,
          description,
        });
      }
      await sleep(100);
      return out;
    },
  },
};
