'use strict';
/**
 * eBay Browse API connector — REAL for-sale products (individual + business
 * sellers) with photos, prices, item specifics, and a real listing URL where
 * buyers contact/buy. Fills the product categories (electronics, phones,
 * computers, fashion, home, beauty, sports, baby) that no free directory can.
 *
 * ACTIVATION: set repo/secret env EBAY_CLIENT_ID + EBAY_CLIENT_SECRET (free eBay
 * developer keys — https://developer.ebay.com/ → create app → Production keyset).
 * Without keys this connector is a safe no-op (logs and returns []).
 *
 * Geography note: eBay sellers are mostly US/EU/Asia, so these are "real seller,
 * international" — great for the diaspora audience and to make product categories
 * genuinely browsable. Local African product inventory comes from Phase 4 partners.
 */
const https = require('https');

function req({ host, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const r = https.request({ host, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    r.setTimeout(30000, () => r.destroy(new Error('timeout')));
    if (body) r.write(body);
    r.end();
  });
}

// Marketplace to query (EBAY_GB tends to ship internationally; override via env).
const MARKETPLACE = process.env.EBAY_MARKETPLACE || 'EBAY_GB';
// Sabalist category -> { q (search), sub fallback }. Subcategory is refined by
// the pipeline's classifySubcategory from the item title.
const SEARCHES = [
  { cat: 'electronics', q: 'tv OR speaker OR camera OR headphones', limit: 50 },
  { cat: 'phones-tablets', q: 'smartphone unlocked', limit: 50 },
  { cat: 'computers', q: 'laptop', limit: 50 },
  { cat: 'fashion', q: 'mens womens clothing shoes', limit: 50 },
  { cat: 'home-furniture', q: 'home furniture decor', limit: 40 },
  { cat: 'beauty', q: 'makeup skincare fragrance', limit: 40 },
  { cat: 'sports-fitness', q: 'fitness gym equipment', limit: 40 },
  { cat: 'baby-kids', q: 'baby kids toys stroller', limit: 40 },
  { cat: 'vehicles', q: 'car parts accessories', limit: 30 },
  { cat: 'business-industrial', q: 'industrial machinery tools', limit: 30 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'ebay-products',
    name: 'eBay Browse — real for-sale products (photos+price+listing URL)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Worldwide',
    license: 'eBay Browse API (official) — real seller listings; contact via item URL.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', amount: 'amount', currency: 'currency',
      images: 'images', coverImage: 'coverImage', url: 'url', priceType: { const: 'fixed' },
    },

    async load() {
      const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
      if (!id || !secret) { console.log('  (ebay-products skipped — set EBAY_CLIENT_ID + EBAY_CLIENT_SECRET to activate)'); return []; }

      // 1) OAuth client-credentials token
      let token;
      try {
        const auth = Buffer.from(`${id}:${secret}`).toString('base64');
        const tk = await req({
          host: 'api.ebay.com', path: '/identity/v1/oauth2/token', method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
        });
        token = JSON.parse(tk.body).access_token;
        if (!token) { console.log('  (ebay-products: no token —', String(tk.body).slice(0, 120), ')'); return []; }
      } catch (e) { console.log('  (ebay-products auth failed:', e.message, ')'); return []; }

      // 2) Search per category
      const out = [];
      for (const s of SEARCHES) {
        try {
          const path = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(s.q)}&limit=${s.limit}&filter=buyingOptions:%7BFIXED_PRICE%7D`;
          const r = await req({ host: 'api.ebay.com', path, headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE } });
          const items = (JSON.parse(r.body).itemSummaries) || [];
          for (const it of items) {
            const img = it.image && it.image.imageUrl;
            if (!it.title || !img || !it.itemWebUrl) continue;
            out.push({
              externalId: `ebay-${it.itemId}`,
              title: String(it.title).slice(0, 120),
              description: `${it.title}${it.condition ? ' — ' + it.condition : ''}. Available from an eBay seller${it.seller && it.seller.username ? ' (' + it.seller.username + ')' : ''}. Contact/buy via the listing link.`.slice(0, 600),
              category: s.cat,
              amount: it.price && it.price.value ? Number(it.price.value) : null,
              currency: (it.price && it.price.currency) || 'USD',
              images: [img], coverImage: img,
              url: it.itemWebUrl,
            });
          }
        } catch (e) { /* per-search failure non-fatal */ }
        await sleep(400);
      }
      return out;
    },
  },
};
