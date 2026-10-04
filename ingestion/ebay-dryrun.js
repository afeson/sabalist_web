#!/usr/bin/env node
'use strict';
/**
 * eBay DRY-RUN — samples real eBay Browse API products for Sabalist's empty
 * PRODUCT categories, maps them into the EXISTING taxonomy, and reports per-
 * category quality metrics. WRITES NOTHING. Imports NOTHING.
 *
 * Needs EBAY_CLIENT_ID + EBAY_CLIENT_SECRET (free eBay dev keys). Optional
 * EBAY_MARKETPLACE (default EBAY_GB — GB sellers ship internationally).
 *
 * "Africa-shippable" is measured with the Browse API `deliveryCountry` filter
 * (Nigeria = largest African market, representative). Cross-listing dedup vs the
 * existing collection happens in the real pipeline (dedup v2: sourceKey/
 * fingerprint); this dry-run dedups WITHIN the batch by eBay itemId.
 */
const https = require('https');
const { classifySubcategory } = require('./lib/taxonomy');

const MARKET = process.env.EBAY_MARKETPLACE || 'EBAY_GB';
const AFRICA_PROBE = process.env.EBAY_AFRICA_COUNTRY || 'NG'; // Nigeria, representative
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Priority EXISTING categories (match ingestion/connectors/ebay.js).
const SEARCHES = [
  { cat: 'electronics', q: 'tv OR speaker OR camera OR headphones', limit: 100 },
  { cat: 'phones-tablets', q: 'smartphone unlocked OR tablet', limit: 100 },
  { cat: 'computers', q: 'laptop OR desktop OR monitor', limit: 100 },
  { cat: 'fashion', q: 'mens womens clothing shoes bag', limit: 100 },
  { cat: 'home-furniture', q: 'home furniture decor appliance', limit: 100 },
  { cat: 'beauty', q: 'makeup skincare fragrance haircare', limit: 100 },
  { cat: 'sports-fitness', q: 'fitness gym equipment sports', limit: 100 },
  { cat: 'baby-kids', q: 'baby kids toys stroller', limit: 100 },
  { cat: 'business-industrial', q: 'industrial machinery tools equipment', limit: 100 },
  { cat: 'vehicles', q: 'car parts accessories tyres', limit: 100 }, // Vehicle Parts / Accessories
];

function req({ host, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const r = https.request({ host, path, method, headers }, (res) => {
      const ch = []; res.on('data', (c) => ch.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(ch).toString('utf8') }));
    });
    r.on('error', reject); r.setTimeout(30000, () => r.destroy(new Error('timeout')));
    if (body) r.write(body); r.end();
  });
}

async function token() {
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('set EBAY_CLIENT_ID + EBAY_CLIENT_SECRET');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const tk = await req({
    host: 'api.ebay.com', path: '/identity/v1/oauth2/token', method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  const t = JSON.parse(tk.body).access_token;
  if (!t) throw new Error('no token: ' + String(tk.body).slice(0, 160));
  return t;
}

async function search(tok, q, limit, deliveryCountry) {
  let filter = 'buyingOptions:%7BFIXED_PRICE%7D';
  if (deliveryCountry) filter += `,deliveryCountry:${deliveryCountry}`;
  const path = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=${Math.min(limit, 200)}&filter=${filter}`;
  const r = await req({ host: 'api.ebay.com', path, headers: { Authorization: `Bearer ${tok}`, 'X-EBAY-C-MARKETPLACE-ID': MARKET } });
  try { return JSON.parse(r.body).itemSummaries || []; } catch { return []; }
}

(async () => {
  const tok = await token();
  const totals = { candidates: 0, africa: 0, photo: 0, price: 0, seller: 0, dupes: 0, importable: 0 };
  const perCat = [];
  const seen = new Set();
  console.log(`--- eBay DRY-RUN (marketplace ${MARKET}, africa-probe ${AFRICA_PROBE}) — NOTHING WRITTEN ---\n`);
  for (const s of SEARCHES) {
    const items = await search(tok, s.q, s.limit);
    await sleep(350);
    const africaItems = await search(tok, s.q, s.limit, AFRICA_PROBE);
    await sleep(350);
    const africaIds = new Set(africaItems.map((i) => i.itemId));
    let candidates = 0, africa = 0, photo = 0, price = 0, seller = 0, dupes = 0, importable = 0;
    const subTally = {};
    for (const it of items) {
      candidates++;
      const img = it.image && it.image.imageUrl;
      const hasPhoto = !!(it.title && img);
      const hasPrice = !!(it.price && it.price.value != null && Number(it.price.value) > 0);
      const hasSeller = !!(it.itemWebUrl && it.seller && it.seller.username);
      const ships = africaIds.has(it.itemId);
      if (hasPhoto) photo++; if (hasPrice) price++; if (hasSeller) seller++; if (ships) africa++;
      const key = `ebay-${it.itemId}`;
      const dup = seen.has(key); if (dup) { dupes++; continue; } seen.add(key);
      // eBay search returns ACTIVE fixed-price listings → not stale.
      const ok = hasPhoto && hasPrice && hasSeller; // diaspora-relevant = any real priced product
      if (ok) {
        importable++;
        const sub = classifySubcategory(s.cat, it.title, '', 'ebay-products') || '(cat default)';
        subTally[sub] = (subTally[sub] || 0) + 1;
      }
    }
    perCat.push({ cat: s.cat, candidates, africa, photo, price, seller, dupes, importable, subs: subTally });
    totals.candidates += candidates; totals.africa += africa; totals.photo += photo; totals.price += price; totals.seller += seller; totals.dupes += dupes; totals.importable += importable;
    console.log(`${s.cat.padEnd(20)} CANDIDATES_FOUND:${String(candidates).padStart(3)}  AFRICA_SHIPPABLE:${String(africa).padStart(3)}  WITH_PHOTO:${String(photo).padStart(3)}  WITH_PRICE:${String(price).padStart(3)}  WITH_VALID_SELLER:${String(seller).padStart(3)}  DUPLICATES_REMOVED:${dupes}  STALE_REMOVED:0  FINAL_IMPORTABLE:${importable}`);
  }
  console.log('\n--- TOTALS ---');
  console.log(JSON.stringify(totals, null, 2));
  console.log('\nIMPORTABLE_BY_SUBCATEGORY (importable items):');
  perCat.forEach((c) => {
    const subs = Object.entries(c.subs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ');
    if (subs) console.log(`  ${c.cat}: ${subs}`);
  });
  console.log('\nDIASPORA_RELEVANT = all importable (real priced consumer products).');
  console.log('AFRICA_SHIPPABLE measured via deliveryCountry=' + AFRICA_PROBE + ' (representative).');
  console.log('Cross-listing dedup vs existing collection runs in the pipeline (dedup v2) at import time.');
  process.exit(0);
})().catch((e) => { console.error('ebay dry-run failed:', e.message); process.exit(1); });
