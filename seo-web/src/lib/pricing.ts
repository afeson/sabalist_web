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

export function formatPrice(listing: any): string {
  if (listing?.displayPriceText) return String(listing.displayPriceText);
  const p = normalisePrice(listing);
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
