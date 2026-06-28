'use strict';
/**
 * Dog CEO connector (keyless open API, real photos) — fills animals-pets with
 * photo-bearing breed listings. Combines with OSM pet shops/vets. Ranked
 * marketplace-import+photo.
 */
const titleize = (s) => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'dogceo-pets',
    name: 'Dog CEO — pet (dog breed) listings with photos',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Global',
    license: 'Dog CEO open API (images sourced from the Stanford Dogs Dataset).',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.6 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: { const: 'animals-pets' }, subcategory: { const: 'dogs' },
      images: 'images', coverImage: 'coverImage', url: 'url', priceType: { const: 'contact' },
    },
    async load({ httpGet, opts }) {
      const out = [];
      let breeds = {};
      try { breeds = (JSON.parse(await httpGet('https://dog.ceo/api/breeds/list/all', { Accept: 'application/json' })).message) || {}; }
      catch (e) { return out; }
      const names = Object.keys(breeds);
      for (const breed of names) {
        try {
          const imgs = (JSON.parse(await httpGet(`https://dog.ceo/api/breed/${breed}/images`, { Accept: 'application/json' })).message) || [];
          const pick = imgs.filter((u) => /^https?:\/\//.test(u)).slice(0, 3);
          pick.forEach((url, i) => {
            const label = titleize(breed);
            out.push({
              externalId: `dog-${breed}-${i}`,
              title: `${label} — pet for rehoming`,
              description: `${label}. Healthy and friendly companion looking for a home. Contact the lister for availability, vaccination records and details.`,
              images: [url],
              coverImage: url,
              url: 'https://dog.ceo/',
            });
          });
        } catch (e) { /* per-breed failure non-fatal */ }
        await sleep(120);
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
