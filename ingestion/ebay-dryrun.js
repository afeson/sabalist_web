#!/usr/bin/env node
'use strict';
/**
 * eBay DRY-RUN — samples real eBay Browse API products for Sabalist's empty
 * product categories, maps into the EXISTING taxonomy, applies the shared
 * validators (photo/price/seller/stale/dedup) and reports per-category metrics.
 * WRITES NOTHING. IMPORTS NOTHING.
 *
 * Needs EBAY_CLIENT_ID + EBAY_CLIENT_SECRET (free eBay dev keys). Optional
 * EBAY_MARKETPLACE (default EBAY_GB), EBAY_AFRICA_COUNTRY (default NG), and
 * EBAY_PAGES (pages of 100 per category, default 2).
 */
const https = require('https');
const { classifySubcategory } = require('./lib/taxonomy');
const { QUERY_PACKS } = require('./lib/product-query-packs');
const { makeReport } = require('./lib/dryrun-filters');

const MARKET = process.env.EBAY_MARKETPLACE || 'EBAY_GB';
const AFRICA = process.env.EBAY_AFRICA_COUNTRY || 'NG';
const PAGES = Math.max(1, Math.min(5, parseInt(process.env.EBAY_PAGES || '2', 10)));
const PER = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function search(tok, q, { offset = 0, deliveryCountry = null } = {}) {
  let filter = 'buyingOptions:%7BFIXED_PRICE%7D';
  if (deliveryCountry) filter += `,deliveryCountry:${deliveryCountry}`;
  const path = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=${PER}&offset=${offset}&filter=${filter}`;
  const r = await req({ host: 'api.ebay.com', path, headers: { Authorization: `Bearer ${tok}`, 'X-EBAY-C-MARKETPLACE-ID': MARKET } });
  try { return JSON.parse(r.body).itemSummaries || []; } catch { return []; }
}

function toDraft(it, cat) {
  const img = it.image && it.image.imageUrl;
  return {
    externalId: `ebay-${it.itemId}`,
    source: 'ebay-products',
    title: String(it.title || '').slice(0, 120),
    category: cat,
    amount: it.price && it.price.value != null ? Number(it.price.value) : null,
    currency: (it.price && it.price.currency) || 'USD',
    images: img ? [img] : [], coverImage: img || null,
    url: it.itemWebUrl || null,
    seller: it.seller && it.seller.username,
    subcategory: classifySubcategory(cat, it.title || '', '', 'ebay-products') || null,
  };
}

(async () => {
  const tok = await token();
  const report = makeReport();
  console.log(`--- eBay DRY-RUN (marketplace ${MARKET}, africa-probe ${AFRICA}, ${PAGES} page(s)x${PER}) — NOTHING WRITTEN ---\n`);
  for (const pack of QUERY_PACKS) {
    const africaIds = new Set((await search(tok, pack.q, { deliveryCountry: AFRICA })).map((i) => i.itemId));
    await sleep(300);
    for (let p = 0; p < PAGES; p++) {
      const items = await search(tok, pack.q, { offset: p * PER });
      await sleep(300);
      for (const it of items) report.add(pack.cat, toDraft(it, pack.cat), { shipsAfrica: africaIds.has(it.itemId) });
      if (items.length < PER) break;
    }
    const c = report.categories[pack.cat] || {};
    console.log(`${pack.cat.padEnd(20)} CANDIDATES:${String(c.candidates || 0).padStart(3)}  AFRICA_SHIPPABLE:${String(c.africa || 0).padStart(3)}  PHOTO:${String(c.photo || 0).padStart(3)}  PRICE:${String(c.price || 0).padStart(3)}  SELLER:${String(c.seller || 0).padStart(3)}  DUP:${c.dupes || 0}  STALE:${c.stale || 0}  IMPORTABLE:${c.importable || 0}`);
  }
  console.log('\n--- TOTALS ---'); console.log(JSON.stringify(report.totals(), null, 2));
  console.log('\nIMPORTABLE_BY_SUBCATEGORY:');
  for (const [cat, c] of Object.entries(report.categories)) {
    const subs = Object.entries(c.subs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ');
    if (subs) console.log(`  ${cat}: ${subs}`);
  }
  console.log('\nAFRICA_SHIPPABLE via deliveryCountry=' + AFRICA + ' · DIASPORA_RELEVANT=all importable · cross-collection dedup runs in pipeline dedup v2 at import.');
  process.exit(0);
})().catch((e) => { console.error('ebay dry-run failed:', e.message); process.exit(1); });
