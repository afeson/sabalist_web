// Pricing model for Sabalist listings.
//
// Backwards-compatible with legacy listings that only have {price,
// currency} — those are treated as PRICE_TYPES.FIXED with amount=price.
//
// Firestore schema (listing document):
//   priceType: 'fixed' | 'negotiable' | 'call_for_price' | 'free' | 'range' | 'none'
//   amount: number | null          // for fixed/negotiable
//   minAmount: number | null       // for range
//   maxAmount: number | null       // for range
//   currency: string               // ISO code (USD, ETB, KES, ...)
//   originalCurrency: string       // same as currency (kept for future FX-conversion display)
//   isNegotiable: boolean          // also true when priceType === 'negotiable'
//   displayPriceText: string       // pre-rendered for search/cards/SEO
//
//   // legacy (kept so old listings still render; do not write new code against this):
//   price: number
//
// Public surface:
//   - PRICE_TYPES                        : enum
//   - normalisePrice(listing)            : returns { priceType, amount, minAmount, maxAmount, currency, isNegotiable }
//   - formatListingPrice(listing, t)     : returns string for cards/detail
//   - buildPriceData(form)               : converts form state -> Firestore fields
//   - listingHasNumericPrice(listing)    : for filtering — true only for fixed/negotiable/range
//   - listingMatchesPriceRange(listing, min, max)

import { DEFAULT_CURRENCY, formatAmount, isValidCurrencyCode } from './currencies';

export const PRICE_TYPES = Object.freeze({
  FIXED: 'fixed',
  NEGOTIABLE: 'negotiable',
  CALL_FOR_PRICE: 'call_for_price',
  FREE: 'free',
  RANGE: 'range',
  NONE: 'none',
});

const KNOWN_TYPES = new Set(Object.values(PRICE_TYPES));

/**
 * Take a listing as it is in Firestore (which may be legacy-shaped) and
 * return a normalised view. Never throws; always returns a complete
 * shape with sensible defaults.
 */
export function normalisePrice(listing) {
  if (!listing) {
    return { priceType: PRICE_TYPES.NONE, amount: null, minAmount: null, maxAmount: null, currency: DEFAULT_CURRENCY, isNegotiable: false };
  }
  const raw = listing.priceType;
  let priceType = KNOWN_TYPES.has(raw) ? raw : null;

  const currency =
    isValidCurrencyCode(listing.currency) ? listing.currency : DEFAULT_CURRENCY;

  // Legacy listing: only `price` field exists. Infer priceType.
  if (!priceType) {
    const legacy = Number(listing.price);
    if (legacy === 0) {
      // Legacy convention "Price on call" — keep neutral
      priceType = PRICE_TYPES.CALL_FOR_PRICE;
    } else if (Number.isFinite(legacy) && legacy > 0) {
      priceType = PRICE_TYPES.FIXED;
    } else {
      priceType = PRICE_TYPES.NONE;
    }
  }

  const amount =
    listing.amount != null
      ? Number(listing.amount)
      : Number.isFinite(Number(listing.price))
      ? Number(listing.price)
      : null;

  const minAmount = listing.minAmount != null ? Number(listing.minAmount) : null;
  const maxAmount = listing.maxAmount != null ? Number(listing.maxAmount) : null;

  return {
    priceType,
    amount: Number.isFinite(amount) ? amount : null,
    minAmount: Number.isFinite(minAmount) ? minAmount : null,
    maxAmount: Number.isFinite(maxAmount) ? maxAmount : null,
    currency,
    isNegotiable: !!listing.isNegotiable || priceType === PRICE_TYPES.NEGOTIABLE,
  };
}

/**
 * Render a listing's price for display. Caller passes an optional `t`
 * (i18next translator) for the labels Free / Call for price / Negotiable.
 * If `t` is omitted we fall back to English defaults.
 */
export function formatListingPrice(listing, t) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  // Listing's pre-rendered text wins if present. This lets the writer
  // freeze whatever the seller saw at create-time (useful for search
  // results and SEO).
  if (listing && typeof listing.displayPriceText === 'string' && listing.displayPriceText.trim()) {
    return listing.displayPriceText;
  }

  const p = normalisePrice(listing);
  const negSuffix = p.isNegotiable
    ? ` · ${tr('pricing.negotiable', 'Negotiable')}`
    : '';

  switch (p.priceType) {
    case PRICE_TYPES.FREE:
      return tr('pricing.free', 'Free');

    case PRICE_TYPES.CALL_FOR_PRICE:
      return tr('pricing.callForPrice', 'Call for price');

    case PRICE_TYPES.NONE:
      return tr('pricing.noPrice', '—');

    case PRICE_TYPES.RANGE: {
      const min = p.minAmount;
      const max = p.maxAmount;
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `${formatAmount(min, p.currency)} – ${formatAmount(max, p.currency)}${negSuffix}`;
      }
      if (Number.isFinite(min)) {
        return `${tr('pricing.from', 'From')} ${formatAmount(min, p.currency)}${negSuffix}`;
      }
      if (Number.isFinite(max)) {
        return `${tr('pricing.upTo', 'Up to')} ${formatAmount(max, p.currency)}${negSuffix}`;
      }
      return tr('pricing.callForPrice', 'Call for price');
    }

    case PRICE_TYPES.FIXED:
    case PRICE_TYPES.NEGOTIABLE:
    default:
      if (!Number.isFinite(p.amount) || p.amount == null) {
        return tr('pricing.callForPrice', 'Call for price');
      }
      return `${formatAmount(p.amount, p.currency)}${negSuffix}`;
  }
}

/**
 * Convert form state (the create/edit listing form) into Firestore
 * fields. Inputs:
 *   priceType: one of PRICE_TYPES values
 *   amountStr / minStr / maxStr: user-typed strings
 *   currency: ISO code
 *   isNegotiable: boolean
 *
 * Returns Firestore document shape (no `price` key — write the new
 * schema; the read-side normaliser handles legacy listings).
 */
export function buildPriceData({
  priceType,
  amount,
  minAmount,
  maxAmount,
  currency,
  isNegotiable,
}) {
  const type = KNOWN_TYPES.has(priceType) ? priceType : PRICE_TYPES.FIXED;
  const cur = isValidCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;
  const num = (v) => {
    if (v == null || v === '') return null;
    const n = typeof v === 'string' ? parseFloat(v.replace(/[,_\s]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const data = {
    priceType: type,
    currency: cur,
    originalCurrency: cur,
    isNegotiable: !!isNegotiable || type === PRICE_TYPES.NEGOTIABLE,
    amount: null,
    minAmount: null,
    maxAmount: null,
  };

  if (type === PRICE_TYPES.FIXED || type === PRICE_TYPES.NEGOTIABLE) {
    data.amount = num(amount);
    // Keep legacy `price` mirror so any old query/UI still reads correctly.
    data.price = data.amount ?? 0;
  } else if (type === PRICE_TYPES.RANGE) {
    data.minAmount = num(minAmount);
    data.maxAmount = num(maxAmount);
    // Legacy mirror: use the lower bound so price-range queries still work.
    data.price = data.minAmount ?? data.maxAmount ?? 0;
  } else {
    // free / call_for_price / none — no numeric price
    data.price = 0;
  }

  data.displayPriceText = formatListingPrice(
    { ...data, priceType: type, currency: cur, isNegotiable: data.isNegotiable }
  );
  return data;
}

/**
 * Whether a listing has a numeric price suitable for min/max filtering.
 * False for call_for_price, free, none.
 */
export function listingHasNumericPrice(listing) {
  const p = normalisePrice(listing);
  if (p.priceType === PRICE_TYPES.FIXED || p.priceType === PRICE_TYPES.NEGOTIABLE) {
    return Number.isFinite(p.amount);
  }
  if (p.priceType === PRICE_TYPES.RANGE) {
    return Number.isFinite(p.minAmount) || Number.isFinite(p.maxAmount);
  }
  return false;
}

/**
 * Filter helper. Returns true if the listing satisfies [min, max]. If
 * the listing has no numeric price (call/free/none), it is EXCLUDED
 * from price-range searches — this matches buyer intent ("show me
 * things under $100" excludes "call for price" items).
 */
export function listingMatchesPriceRange(listing, min, max) {
  const p = normalisePrice(listing);
  const hasMin = min != null && min !== '' && Number.isFinite(Number(min));
  const hasMax = max != null && max !== '' && Number.isFinite(Number(max));
  if (!hasMin && !hasMax) return true;

  let value;
  if (p.priceType === PRICE_TYPES.FIXED || p.priceType === PRICE_TYPES.NEGOTIABLE) {
    value = p.amount;
  } else if (p.priceType === PRICE_TYPES.RANGE) {
    // A range overlaps the query if its max >= queryMin and its min <= queryMax.
    const lo = p.minAmount ?? p.maxAmount;
    const hi = p.maxAmount ?? p.minAmount;
    if (!Number.isFinite(lo) && !Number.isFinite(hi)) return false;
    if (hasMin && Number.isFinite(hi) && hi < Number(min)) return false;
    if (hasMax && Number.isFinite(lo) && lo > Number(max)) return false;
    return true;
  } else {
    return false;
  }

  if (!Number.isFinite(value)) return false;
  if (hasMin && value < Number(min)) return false;
  if (hasMax && value > Number(max)) return false;
  return true;
}
