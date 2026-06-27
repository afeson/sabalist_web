'use strict';
/**
 * Open*Facts connector (Open Food Facts + Open Beauty Facts) — open data (ODbL,
 * automated API) with PRODUCT PHOTOS. Adds photo-bearing inventory to Beauty
 * and Food. Worldwide catalog (no per-country split); ranked as "marketplace
 * import + photo" (above directory/jobs).
 *
 * Modular: each sub-source is a {host, category, pages} entry — add more
 * Open*Facts hosts by extending FEEDS.
 */
const FEEDS = [
  { id: 'beauty', category: 'beauty', url: 'https://world.openbeautyfacts.org/api/v2/search', v2: true, pages: 6 },
  { id: 'food', category: 'food', url: 'https://world.openfoodfacts.org/cgi/search.pl', v2: false, pages: 6 },
];
const PAGE_SIZE = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'openfacts-products',
    name: 'Open*Facts — Beauty & Food products (open, with photos)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Global',
    license: 'Open Food/Beauty Facts (ODbL) — © contributors; attribution via sourceUrl.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', images: 'images', coverImage: 'coverImage',
      url: 'url', priceType: { const: 'none' },
    },

    async load({ httpGet, opts }) {
      const out = [];
      for (const feed of FEEDS) {
        for (let page = 1; page <= feed.pages; page++) {
          try {
            const qs = feed.v2
              ? `?page=${page}&page_size=${PAGE_SIZE}&fields=code,product_name,image_url,brands,categories_tags&sort_by=unique_scans_n`
              : `?action=process&json=1&page=${page}&page_size=${PAGE_SIZE}&sort_by=unique_scans_n&fields=code,product_name,image_url,brands`;
            const raw = await httpGet(feed.url + qs, { Accept: 'application/json' });
            const products = (JSON.parse(raw).products) || [];
            if (!products.length) break;
            for (const p of products) {
              const name = (p.product_name || '').trim();
              const img = p.image_url;
              if (!name || !img || !/^https?:\/\//.test(img)) continue; // require name + photo
              out.push({
                externalId: `off-${feed.id}-${p.code || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`,
                title: name,
                description: `${name}${p.brands ? ' — ' + p.brands : ''}. ${feed.category} product (Open ${feed.id === 'beauty' ? 'Beauty' : 'Food'} Facts).`,
                category: feed.category,
                images: [img],
                coverImage: img,
                url: p.code ? `https://world.open${feed.id === 'beauty' ? 'beauty' : 'food'}facts.org/product/${p.code}` : '',
              });
            }
          } catch (e) { /* page failure non-fatal */ }
          await sleep(400);
          if (opts && opts.limit && out.length >= opts.limit * 3) return out;
        }
      }
      return out;
    },
  },
};
