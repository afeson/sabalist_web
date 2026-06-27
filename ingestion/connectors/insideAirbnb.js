'use strict';
/**
 * Inside Airbnb connector — real short/long-term RENTAL listings worldwide, with
 * PHOTOS, prices, locations and listing URLs (CC BY 4.0). Auto-discovers current
 * per-city dataset URLs from the public data page, downloads the gzipped detailed
 * CSV, and maps each row into a real-estate (apartments / houses-rent) listing.
 *
 * Ranked as marketplace-import+photo. Worldwide (Africa cities included where
 * Inside Airbnb covers them, e.g. Cape Town).
 */
const https = require('https');
const zlib = require('zlib');

function getBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SabalistIngestion/0.1)' } }, (r) => {
      if (r.statusCode >= 400) { r.resume(); return reject(new Error(`HTTP ${r.statusCode}`)); }
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => req.destroy(new Error('timeout'))); // a stalled city must not hang the whole run
  });
}
const titleize = (s) => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'insideairbnb-rentals',
    name: 'Inside Airbnb — rental listings worldwide (CC, photos)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Worldwide',
    license: 'Inside Airbnb (CC BY 4.0) — attribution via sourceUrl (listing links to airbnb.com).',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      amount: 'amount', currency: 'currency', category: 'category', subcategory: 'subcategory',
      location: 'location', country: 'country', images: 'images', coverImage: 'coverImage', url: 'url',
    },

    async load({ parse, httpGet, opts }) {
      const out = [];
      // 1) Discover current detailed dataset URLs.
      let page = '';
      try { page = await httpGet('https://insideairbnb.com/get-the-data/', {}); } catch (e) { return out; }
      const all = [...new Set((page.match(/https:\/\/data\.insideairbnb\.com\/[^"']+\/data\/listings\.csv\.gz/g) || []))];
      // Prefer a diverse spread: dedup by city, prioritize big/African/diaspora hubs.
      const PRIORITY = /cape-town|nairobi|marrakech|lagos|new-york|london|paris|toronto|sydney|berlin|amsterdam|barcelona|rome|los-angeles|washington|chicago|melbourne|dublin|lisbon|madrid/i;
      const sorted = [...all].sort((a, b) => (PRIORITY.test(b) ? 1 : 0) - (PRIORITY.test(a) ? 1 : 0));
      const MAX_CITIES = opts && opts.limit ? 1 : 15;
      const PER_CITY = 250;

      for (const url of sorted.slice(0, MAX_CITIES)) {
        try {
          const csv = zlib.gunzipSync(await getBuffer(url)).toString('utf8');
          const rows = parse('csv', csv);
          const m = url.match(/data\.insideairbnb\.com\/([^/]+)\/[^/]+\/([^/]+)\//);
          const country = m ? titleize(m[1]) : '';
          const city = m ? titleize(m[2]) : '';
          let n = 0;
          for (const r of rows) {
            const name = (r.name || '').trim();
            const pic = r.picture_url;
            if (!name || !pic || !/^https?:\/\//.test(pic)) continue;
            const amount = parseFloat(String(r.price || r.price_quote_price_per_night || '').replace(/[^0-9.]/g, '')) || null;
            const desc = String(r.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            out.push({
              externalId: `airbnb-${r.id}`,
              title: name.slice(0, 120),
              description: (desc || `${name} — ${r.room_type || 'rental'} in ${city}, ${country}.`).slice(0, 600),
              amount,
              currency: 'USD',
              category: 'real-estate',
              subcategory: /entire/i.test(r.room_type || '') ? 'apartments' : 'houses-rent',
              location: [r.neighbourhood_cleansed || r.neighbourhood || '', city].filter(Boolean).join(', '),
              country,
              images: [pic],
              coverImage: pic,
              url: r.listing_url || `https://www.airbnb.com/rooms/${r.id}`,
            });
            if (++n >= PER_CITY) break;
          }
        } catch (e) { /* per-city failure non-fatal */ }
        await sleep(500);
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
