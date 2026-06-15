// Supported currencies for Sabalist listings. Prioritised for African
// marketplaces; USD/EUR/GBP kept as universal fallbacks. Symbol is the
// short prefix shown in compact listing cards; name is the full label
// used in the picker.
//
// Use `formatAmount(amount, code)` for consistent rendering across the
// app. Do not hardcode "$" or "USD" anywhere — use this module.

export const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'ETB', symbol: 'Br',  name: 'Ethiopian Birr' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand' },
  { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  { code: 'MAD', symbol: 'DH',  name: 'Moroccan Dirham' },
  { code: 'DZD', symbol: 'DA',  name: 'Algerian Dinar' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
];

export const DEFAULT_CURRENCY = 'USD';

const CURRENCY_INDEX = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code) {
  return CURRENCY_INDEX[code] || CURRENCY_INDEX[DEFAULT_CURRENCY];
}

export function isValidCurrencyCode(code) {
  return !!CURRENCY_INDEX[code];
}

/**
 * Format an amount with currency code prefix:
 *   formatAmount(500, 'USD')   -> "USD 500"
 *   formatAmount(25000, 'ETB') -> "ETB 25,000"
 *
 * The code-prefix (vs symbol-prefix) is intentional: it is unambiguous
 * across overlapping symbols (R = ZAR vs INR rupee, $ = USD vs NGN
 * before redenomination, etc.) and matches the marketplace convention
 * used by OLX / Jiji in African markets.
 */
export function formatAmount(amount, code) {
  const cur = getCurrency(code);
  const n = Number(amount);
  if (!Number.isFinite(n)) return cur.code;
  return `${cur.code} ${n.toLocaleString()}`;
}
