'use strict';
/**
 * DummyJSON products connector — photo'd, priced products across the core
 * marketplace categories (phones, computers, fashion, beauty, home-furniture,
 * vehicles, sports, food). Open API, clean CDN images. Ranked marketplace-import+photo.
 * Seeds the product categories with real imagery; combine with keyed retail
 * feeds for larger volume.
 */
const CATMAP = {
  beauty: 'beauty', 'skin-care': 'beauty', fragrances: 'beauty',
  furniture: 'home-furniture', 'home-decoration': 'home-furniture', 'kitchen-accessories': 'home-furniture',
  laptops: 'computers',
  smartphones: 'phones-tablets', tablets: 'phones-tablets', 'mobile-accessories': 'phones-tablets',
  'mens-shirts': 'fashion', 'mens-shoes': 'fashion', 'mens-watches': 'fashion', tops: 'fashion',
  'womens-dresses': 'fashion', 'womens-shoes': 'fashion', 'womens-bags': 'fashion',
  'womens-jewellery': 'fashion', 'womens-watches': 'fashion', sunglasses: 'fashion',
  motorcycle: 'vehicles', vehicle: 'vehicles',
  'sports-accessories': 'sports-fitness',
  groceries: 'food',
};

module.exports = {
  source: {
    id: 'dummyjson-products',
    name: 'DummyJSON — products across marketplace categories (photos+prices)',
    enabled: false, // DEMO API (fake sellers, JSON source link) — removed; real sources only
    ownerUserId: 'imported-listings',
    region: 'Global',
    license: 'DummyJSON open product API.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', amount: 'amount', currency: { const: 'USD' },
      images: 'images', coverImage: 'coverImage', url: 'url', priceType: { const: 'fixed' },
    },
    async load({ httpGet }) {
      const raw = await httpGet('https://dummyjson.com/products?limit=0', { Accept: 'application/json' });
      const products = (JSON.parse(raw).products) || [];
      const out = [];
      for (const p of products) {
        const category = CATMAP[p.category];
        if (!category) continue;
        const imgs = (Array.isArray(p.images) && p.images.length ? p.images : [p.thumbnail]).filter(Boolean);
        if (!imgs.length) continue;
        out.push({
          externalId: `dj-${p.id}`,
          title: (p.title || '').trim(),
          description: `${(p.description || '').trim()}${p.brand ? ' — ' + p.brand : ''}`.slice(0, 500),
          category,
          amount: Number(p.price) || null,
          images: imgs,
          coverImage: imgs[0],
          url: `https://dummyjson.com/products/${p.id}`,
        });
      }
      return out;
    },
  },
};
