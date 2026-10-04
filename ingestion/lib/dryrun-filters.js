'use strict';
/**
 * Shared dry-run / import validators used by every product source (eBay,
 * AliExpress, …). Keeps relevance/dedup/normalization identical across sources.
 * Pure functions — no I/O, no writes.
 */

// --- price ------------------------------------------------------------------
function normalizePrice(amount, currency) {
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;
  if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
  const cur = String(currency || '').trim().toUpperCase();
  return { amount: Math.round(n * 100) / 100, currency: /^[A-Z]{3}$/.test(cur) ? cur : 'USD' };
}

// --- photo ------------------------------------------------------------------
function validImage(url) {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  // reject obvious placeholders/spacers
  if (/no[-_]?image|placeholder|spacer|blank\.(gif|png)/i.test(url)) return false;
  return true;
}

// --- seller / listing link --------------------------------------------------
function validSellerLink(url, seller) {
  if (!url || !/^https?:\/\//i.test(url)) return false;    // must have a real listing/buy URL
  return !!(seller && String(seller).trim());               // and an identifiable seller
}

// --- staleness (feeds that carry availability/end dates) --------------------
function isStale(item) {
  // eBay/AliExpress search return ACTIVE items, so default is fresh. If a feed
  // provides an end/expiry or availability flag, honor it.
  if (item && item.endDate && new Date(item.endDate).getTime() < Date.now()) return true;
  if (item && item.available === false) return true;
  return false;
}

// --- relevance --------------------------------------------------------------
// Diaspora-relevant = any real priced consumer product (default true for the
// product feeds). Africa-shippable is measured per-source via the API's own
// shipping filter (eBay deliveryCountry, AliExpress shipTo), not guessed here.
function isDiasporaRelevant(draft) {
  return !!(draft && draft.title && draft.amount && draft.amount > 0);
}

// --- dedup ------------------------------------------------------------------
function normTitle(t) {
  return String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// Stable per-source id (never collides with a real user's listing). The real
// pipeline additionally dedups against the existing collection via dedup v2.
function dedupKey(draft) {
  if (draft.externalId) return String(draft.externalId);
  return `${draft.source || 'src'}:${normTitle(draft.title).slice(0, 60)}`;
}

// --- attribution ------------------------------------------------------------
function attribution(sourceId, url, note) {
  return { source: sourceId, sourceUrl: url || null, attribution: note || null };
}

// --- per-category report aggregator ----------------------------------------
function makeReport() {
  const cats = {};
  const row = () => ({ candidates: 0, africa: 0, photo: 0, price: 0, seller: 0, stale: 0, dupes: 0, importable: 0, subs: {} });
  const seen = new Set();
  return {
    add(cat, draft, { shipsAfrica = false } = {}) {
      const c = (cats[cat] = cats[cat] || row());
      c.candidates++;
      const hasPhoto = validImage(draft.coverImage || (draft.images && draft.images[0]));
      const price = normalizePrice(draft.amount, draft.currency);
      const hasSeller = validSellerLink(draft.url, draft.seller);
      const stale = isStale(draft);
      if (hasPhoto) c.photo++;
      if (price) c.price++;
      if (hasSeller) c.seller++;
      if (shipsAfrica) c.africa++;
      if (stale) { c.stale++; return { importable: false, reason: 'stale' }; }
      const key = dedupKey(draft);
      if (seen.has(key)) { c.dupes++; return { importable: false, reason: 'duplicate' }; }
      seen.add(key);
      const ok = hasPhoto && !!price && hasSeller && isDiasporaRelevant({ ...draft, amount: price && price.amount });
      if (ok) { c.importable++; if (draft.subcategory) c.subs[draft.subcategory] = (c.subs[draft.subcategory] || 0) + 1; }
      return { importable: ok, reason: ok ? 'importable' : 'insufficient-data' };
    },
    categories: cats,
    totals() {
      const t = { candidates: 0, africa: 0, photo: 0, price: 0, seller: 0, stale: 0, dupes: 0, importable: 0 };
      for (const c of Object.values(cats)) for (const k of Object.keys(t)) t[k] += c[k];
      return t;
    },
  };
}

module.exports = { normalizePrice, validImage, validSellerLink, isStale, isDiasporaRelevant, normTitle, dedupKey, attribution, makeReport };
