// Minimal port of ../../../src/lib/pricing.js — enough for SEO rendering and
// Product/Offer schema. Backwards-compatible with legacy {price,currency}.
export const PRICE_TYPES = {
  FIXED: 'fixed', NEGOTIABLE: 'negotiable', CALL_FOR_PRICE: 'call_for_price',
  FREE: 'free', RANGE: 'range', NONE: 'none',
} as const;
export type PriceType = (typeof PRICE_TYPES)[keyof typeof PRICE_TYPES];

const KNOWN = new Set<string>(Object.values(PRICE_TYPES));

export type NormalisedPrice = {
  priceType: PriceType; amount: number | null; minAmount: number | null;
  maxAmount: number | null; currency: string; isNegotiable: boolean;
};

export function normalisePrice(listing: any): NormalisedPrice {
  const currency = (listing?.currency as string) || 'USD';
  let priceType: PriceType | null = KNOWN.has(listing?.priceType) ? listing.priceType : null;
  if (!priceType) {
    const legacy = Number(listing?.price);
    if (!legacy || legacy === 0) priceType = PRICE_TYPES.CALL_FOR_PRICE;
    else priceType = PRICE_TYPES.FIXED;
    return { priceType, amount: legacy || null, minAmount: null, maxAmount: null, currency, isNegotiable: false };
  }
  return {
    priceType,
    amount: listing?.amount ?? (Number(listing?.price) || null),
    minAmount: listing?.minAmount ?? null,
    maxAmount: listing?.maxAmount ?? null,
    currency,
    isNegotiable: priceType === PRICE_TYPES.NEGOTIABLE || !!listing?.isNegotiable,
  };
}

// Guard against currency-conversion glitches (e.g. an ETB amount multiplied by
// the ~96 ETB/USD rate → "USD 911,721,500"). No classified ad is a real ~1B, so
// absurd amounts render as their negotiable/contact label instead of a broken
// number. Also rejects any pre-baked displayPriceText carrying a 9+ digit value.
const ABSURD_AMOUNT = 200_000_000;
function looksBroken(listing: any): boolean {
  const amt = Number(listing?.amount ?? listing?.maxAmount ?? listing?.price) || 0;
  if (amt >= ABSURD_AMOUNT) return true;
  return /\d{9,}/.test(String(listing?.displayPriceText || '').replace(/[,\s]/g, ''));
}

export function formatPrice(listing: any): string {
  const p = normalisePrice(listing);
  if (looksBroken(listing)) return p.isNegotiable ? 'Negotiable' : 'Contact for price';
  if (listing?.displayPriceText) return String(listing.displayPriceText);
  const fmt = (n: number) => `${p.currency} ${Number(n).toLocaleString()}`;
  switch (p.priceType) {
    case PRICE_TYPES.FREE: return 'Free';
    case PRICE_TYPES.CALL_FOR_PRICE: return 'Contact for price';
    case PRICE_TYPES.NONE: return '';
    case PRICE_TYPES.RANGE:
      return p.minAmount != null && p.maxAmount != null ? `${fmt(p.minAmount)} – ${fmt(p.maxAmount)}` : '';
    default:
      return p.amount != null ? `${fmt(p.amount)}${p.isNegotiable ? ' (negotiable)' : ''}` : 'Contact for price';
  }
}
