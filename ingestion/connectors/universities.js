'use strict';
/**
 * Universities connector — Hipolabs Universities API (free, open, per-country).
 * http://universities.hipolabs.com/search?country=<Name>
 *
 * Loops every African country → Education listings. Uses the load() hook so the
 * connector does its own per-country fetching; the engine is unchanged.
 */
const AFRICA = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
  'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo',
  'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea',
  'Eritrea', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
  "Cote d'Ivoire", 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi',
  'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
  'Nigeria', 'Rwanda', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
  'Zambia', 'Zimbabwe',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  source: {
    id: 'hipolabs-universities-africa',
    name: 'Hipolabs — African Universities (open API)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'Open universities dataset (universities.hipolabs.com).',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', location: 'location', country: 'country',
      url: 'url', priceType: { const: 'none' },
    },

    async load({ httpGet, opts }) {
      const out = [];
      const countries = AFRICA;
      for (const country of countries) {
        try {
          const raw = await httpGet(`http://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`, { Accept: 'application/json' });
          const list = JSON.parse(raw);
          for (const u of list) {
            const web = (u.web_pages || [])[0] || '';
            out.push({
              externalId: `uni-${(u.alpha_two_code || country).toLowerCase()}-${String(u.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
              title: u.name,
              description: `${u.name} — university/higher-education institution in ${country}. Open education listing (universities.hipolabs.com).`,
              category: 'education',
              location: [(u['state-province'] || ''), country].filter(Boolean).join(', '),
              country,
              url: web,
            });
          }
        } catch (e) {
          // per-country failure is non-fatal
        }
        await sleep(150);
        if (opts && opts.limit && out.length >= opts.limit * 5) break; // keep test runs short
      }
      return out;
    },
  },
};
