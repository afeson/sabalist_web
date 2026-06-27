'use strict';
/**
 * Lightweight geo, currency and language detection for incoming listings.
 *
 * This is deliberately dependency-free and heuristic — good enough to route and
 * tag the priority markets (Africa, diaspora US/CA/UK/EU/ME/AU). For production
 * scale you can swap in a gazetteer / libpostal without changing callers.
 */

// Priority countries with canonical name, ISO, default currency, common cities.
const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', region: 'Africa', cities: ['lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city'] },
  { code: 'GH', name: 'Ghana', currency: 'GHS', region: 'Africa', cities: ['accra', 'kumasi', 'tamale', 'takoradi'] },
  { code: 'KE', name: 'Kenya', currency: 'KES', region: 'Africa', cities: ['nairobi', 'mombasa', 'kisumu', 'nakuru'] },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', region: 'Africa', cities: ['addis ababa', 'dire dawa', 'mekelle', 'hawassa', 'bahir dar'] },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', region: 'Africa', cities: ['johannesburg', 'cape town', 'durban', 'pretoria', 'soweto'] },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', region: 'Africa', cities: ['dar es salaam', 'dodoma', 'arusha', 'mwanza'] },
  { code: 'UG', name: 'Uganda', currency: 'UGX', region: 'Africa', cities: ['kampala', 'gulu', 'mbarara'] },
  { code: 'EG', name: 'Egypt', currency: 'EGP', region: 'Africa', cities: ['cairo', 'alexandria', 'giza'] },
  { code: 'US', name: 'United States', currency: 'USD', region: 'Diaspora-US', cities: ['new york', 'washington', 'atlanta', 'houston', 'minneapolis', 'columbus', 'dallas', 'los angeles', 'chicago', 'seattle'] },
  { code: 'CA', name: 'Canada', currency: 'CAD', region: 'Canada', cities: ['toronto', 'ottawa', 'calgary', 'edmonton', 'vancouver', 'montreal', 'winnipeg'] },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', region: 'UK', cities: ['london', 'manchester', 'birmingham', 'leeds', 'leicester'] },
  { code: 'DE', name: 'Germany', currency: 'EUR', region: 'Europe', cities: ['berlin', 'frankfurt', 'munich', 'hamburg', 'cologne'] },
  { code: 'FR', name: 'France', currency: 'EUR', region: 'Europe', cities: ['paris', 'marseille', 'lyon'] },
  { code: 'IT', name: 'Italy', currency: 'EUR', region: 'Europe', cities: ['rome', 'milan', 'turin'] },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', region: 'Middle East', cities: ['dubai', 'abu dhabi', 'sharjah'] },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', region: 'Middle East', cities: ['riyadh', 'jeddah', 'mecca'] },
  { code: 'AU', name: 'Australia', currency: 'AUD', region: 'Australia', cities: ['sydney', 'melbourne', 'perth', 'brisbane'] },
];

const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const BY_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

// Currency symbols / codes → ISO currency.
const CURRENCY_SYMBOLS = { '$': 'USD', '£': 'GBP', '€': 'EUR', '₦': 'NGN', '₵': 'GHS', 'KSh': 'KES', 'R': 'ZAR', 'ብር': 'ETB', 'AED': 'AED', 'A$': 'AUD', 'C$': 'CAD' };
const CURRENCY_CODES = new Set(['USD', 'GBP', 'EUR', 'NGN', 'GHS', 'KES', 'ETB', 'ZAR', 'TZS', 'UGX', 'EGP', 'CAD', 'AED', 'SAR', 'AUD']);

function norm(s) { return String(s || '').toLowerCase().trim(); }

/** Detect country (+region) from explicit country field, then from location text. */
function detectCountry({ country = '', location = '', city = '' } = {}) {
  const c = norm(country);
  if (c && BY_CODE[country?.toUpperCase()]) return BY_CODE[country.toUpperCase()];
  if (c && BY_NAME[c]) return BY_NAME[c];

  const hay = `${norm(location)} ${norm(city)} ${c}`;
  // Match a city first (more specific), then a country name.
  for (const country of COUNTRIES) {
    if (country.cities.some((ci) => hay.includes(ci))) return country;
  }
  for (const country of COUNTRIES) {
    if (hay.includes(country.name.toLowerCase())) return country;
  }
  return null;
}

/** Pull a city name out of free location text, given a resolved country. */
function detectCity({ location = '', city = '' } = {}, country) {
  const explicit = norm(city);
  if (explicit) return titleCase(explicit);
  const hay = norm(location);
  if (country) {
    const hit = country.cities.find((ci) => hay.includes(ci));
    if (hit) return titleCase(hit);
  }
  // Fallback: first comma-separated token of the location.
  const first = norm(location).split(',')[0];
  return first ? titleCase(first) : null;
}

/** Detect currency from an explicit field, a price string, or the country default. */
function detectCurrency({ currency = '', priceText = '', price = '' } = {}, country) {
  const cur = String(currency || '').toUpperCase().trim();
  if (CURRENCY_CODES.has(cur)) return cur;
  const text = `${currency} ${priceText} ${price}`;
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(sym)) return code;
  }
  return country ? country.currency : 'USD';
}

/** Very rough language guess from text (covers our priority locales). */
function detectLanguage(text = '') {
  const t = String(text || '');
  if (/[ሀ-፿]/.test(t)) return 'am'; // Ethiopic (Amharic/Tigrinya)
  if (/[؀-ۿ]/.test(t)) return 'ar'; // Arabic
  const low = t.toLowerCase();
  if (/\b(maison|appartement|vendre|à louer|voiture)\b/.test(low)) return 'fr';
  if (/\b(casa|venta|alquiler|coche|empleo)\b/.test(low)) return 'es';
  if (/\b(haus|wohnung|verkauf|miete|auto)\b/.test(low)) return 'de';
  return 'en';
}

function titleCase(s) {
  return String(s || '').replace(/\b\w/g, (m) => m.toUpperCase());
}

/** One-shot enrichment used by the pipeline. */
function enrichGeo(record) {
  const country = detectCountry(record);
  const city = detectCity(record, country);
  const currency = detectCurrency(record, country);
  const language = detectLanguage(`${record.title || ''} ${record.description || ''}`);
  return {
    country: country ? country.name : null,
    countryCode: country ? country.code : null,
    region: country ? country.region : null,
    city,
    currency,
    language,
  };
}

module.exports = { COUNTRIES, detectCountry, detectCity, detectCurrency, detectLanguage, enrichGeo };
