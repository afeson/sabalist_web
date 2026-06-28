'use strict';
/**
 * Public-holidays connector (Nager.Date, keyless open API) — fills events-tickets
 * with real, dated events across many countries (Africa-first, then worldwide).
 * No photos (holidays have none) so these rank as marketplace-import (no-photo).
 */
const YEARS = ['2026', '2027'];
const COUNTRIES = [ // Africa first, then a worldwide spread (Nager-supported codes only)
  'NG', 'KE', 'GH', 'ZA', 'EG', 'MA', 'TN', 'UG', 'NA', 'MZ', 'AO', 'BW', 'ZW',
  'US', 'GB', 'CA', 'FR', 'DE', 'NL', 'ES', 'IT', 'PT', 'IE', 'AU', 'BR', 'IN', 'AE', 'SA',
];
const NAME = {
  NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', ZA: 'South Africa', EG: 'Egypt', MA: 'Morocco',
  TN: 'Tunisia', UG: 'Uganda', NA: 'Namibia', MZ: 'Mozambique', AO: 'Angola', BW: 'Botswana',
  ZW: 'Zimbabwe', US: 'United States', GB: 'United Kingdom', CA: 'Canada', FR: 'France',
  DE: 'Germany', NL: 'Netherlands', ES: 'Spain', IT: 'Italy', PT: 'Portugal', IE: 'Ireland',
  AU: 'Australia', BR: 'Brazil', IN: 'India', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'nager-holidays-events',
    name: 'Public holidays (Nager.Date) — events worldwide',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Worldwide',
    license: 'Nager.Date public-holiday API (open).',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.6 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: { const: 'events-tickets' }, location: 'location', country: 'country',
      url: 'url', priceType: { const: 'none' },
    },
    async load({ httpGet, opts }) {
      const out = [];
      for (const cc of COUNTRIES) {
        for (const yr of YEARS) {
          try {
            const raw = await httpGet(`https://date.nager.at/api/v3/PublicHolidays/${yr}/${cc}`, { Accept: 'application/json' });
            const hs = JSON.parse(raw) || [];
            for (const h of hs) {
              const country = NAME[cc] || cc;
              out.push({
                externalId: `hol-${cc}-${h.date}`,
                title: `${h.localName || h.name} — ${country} (${h.date})`,
                description: `${h.name} is a public holiday in ${country} on ${h.date}. Browse local events and tickets around this date.`,
                location: country,
                country,
                url: 'https://date.nager.at/',
              });
            }
          } catch (e) { /* per-country/year failure non-fatal */ }
          await sleep(150);
          if (opts && opts.limit && out.length >= opts.limit * 3) return out;
        }
      }
      return out;
    },
  },
};
