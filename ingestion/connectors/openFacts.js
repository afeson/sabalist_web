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
  // Baby / infant food — fills baby-kids/baby-food. Open Food Facts product page
  // (sourceUrl) is the contact/source path; product photos kept. Filtered to the
  // `baby-food` category facet via the v2 search.
  { id: 'baby-food', category: 'baby-kids', subcategory: 'baby-food', url: 'https://world.openfoodfacts.org/api/v2/search', v2: true, filter: 'categories_tags_en=baby-food', pages: 6 },
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
      category: 'category', subcategory: 'subcategory', images: 'images', coverImage: 'coverImage',
      url: 'url', priceType: { const: 'none' },
    },

    async load({ httpGet, opts }) {
      const out = [];
      for (const feed of FEEDS) {
        const host = feed.id === 'beauty' ? 'beauty' : 'food'; // baby-food lives on openfoodfacts.org
        for (let page = 1; page <= feed.pages; page++) {
          try {
            const qs = feed.v2
              ? `?page=${page}&page_size=${PAGE_SIZE}&fields=code,product_name,image_url,brands,categories_tags&sort_by=unique_scans_n${feed.filter ? '&' + feed.filter : ''}`
              : `?action=process&json=1&page=${page}&page_size=${PAGE_SIZE}&sort_by=unique_scans_n&fields=code,product_name,image_url,brands`;
            const raw = await httpGet(feed.url + qs, { Accept: 'application/json' });
            const products = (JSON.parse(raw).products) || [];
            if (!products.length) break;
            for (const p of products) {
              const name = (p.product_name || '').trim();
              const img = p.image_url;
              if (!name || !img || !/^https?:\/\//.test(img)) continue; // require name + photo
              const label = feed.id === 'beauty' ? 'Open Beauty Facts' : 'Open Food Facts';
              const kind = feed.id === 'baby-food' ? 'baby & infant food' : `${feed.category} product`;
              const rec = {
                externalId: `off-${feed.id}-${p.code || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`,
                title: name,
                description: `${name}${p.brands ? ' — ' + p.brands : ''}. ${kind} (${label}).`,
                category: feed.category,
                images: [img],
                coverImage: img,
                // Product page (sourceUrl) is the source/contact path for this listing.
                url: p.code ? `https://world.open${host}facts.org/product/${p.code}` : '',
              };
              if (feed.subcategory) rec.subcategory = feed.subcategory;
              out.push(rec);
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
