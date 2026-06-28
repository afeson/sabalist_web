'use strict';
/**
 * Inside Airbnb (RENTALS variant) — fills the `rentals` category from a DIFFERENT
 * set of cities than the real-estate connector (it takes cities ranked 35..75,
 * skipping the ones already imported as real-estate). Same CC BY 4.0 source,
 * photos + prices. Keeps real-estate full while populating rentals.
 */
const https = require('https');
const zlib = require('zlib');

function getBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SabalistIngestion/0.1)' } }, (r) => {
      if (r.statusCode >= 400) { r.resume(); return reject(new Error(`HTTP ${r.statusCode}`)); }
      const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => req.destroy(new Error('timeout')));
  });
}
const titleize = (s) => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'insideairbnb-rentals-extra',
    name: 'Inside Airbnb (rentals category) — additional cities (CC, photos)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Worldwide',
    license: 'Inside Airbnb (CC BY 4.0) — attribution via sourceUrl.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      amount: 'amount', currency: { const: 'USD' }, category: { const: 'rentals' }, subcategory: 'subcategory',
      location: 'location', country: 'country', images: 'images', coverImage: 'coverImage', url: 'url',
    },
    async load({ parse, httpGet, opts }) {
      const out = [];
      let page = '';
      try { page = await httpGet('https://insideairbnb.com/get-the-data/', {}); } catch (e) { return out; }
      const all = [...new Set((page.match(/https:\/\/data\.insideairbnb\.com\/[^"']+\/data\/listings\.csv\.gz/g) || []))];
      const PRIORITY = /cape-town|nairobi|marrakech|lagos|new-york|london|paris|toronto|sydney|berlin|amsterdam|barcelona|rome|los-angeles|washington|chicago|melbourne|dublin|lisbon|madrid/i;
      const sorted = [...all].sort((a, b) => (PRIORITY.test(b) ? 1 : 0) - (PRIORITY.test(a) ? 1 : 0));
      const slice = opts && opts.limit ? sorted.slice(35, 36) : sorted.slice(35, 75); // cities NOT used by real-estate
      const PER_CITY = 300;
      for (const url of slice) {
        try {
          const csv = zlib.gunzipSync(await getBuffer(url)).toString('utf8').slice(0, 2500000);
          const rows = parse('csv', csv);
          const m = url.match(/data\.insideairbnb\.com\/([^/]+)\/[^/]+\/([^/]+)\//);
          const country = m ? titleize(m[1]) : ''; const city = m ? titleize(m[2]) : '';
          let n = 0;
          for (const r of rows) {
            const name = (r.name || '').trim(); const pic = r.picture_url;
            if (!name || !pic || !/^https?:\/\//.test(pic)) continue;
            const amount = parseFloat(String(r.price || r.price_quote_price_per_night || '').replace(/[^0-9.]/g, '')) || null;
            const desc = String(r.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            out.push({
              externalId: `airbnbx-${r.id}`,
              title: name.slice(0, 120),
              description: (desc || `${name} — ${r.room_type || 'rental'} in ${city}, ${country}.`).slice(0, 600),
              amount,
              subcategory: /entire/i.test(r.room_type || '') ? 'apartments' : 'rooms',
              location: [r.neighbourhood_cleansed || r.neighbourhood || '', city].filter(Boolean).join(', '),
              country, images: [pic], coverImage: pic,
              url: r.listing_url || `https://www.airbnb.com/rooms/${r.id}`,
            });
            if (++n >= PER_CITY) break;
          }
        } catch (e) { /* per-city non-fatal */ }
        await sleep(500);
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
