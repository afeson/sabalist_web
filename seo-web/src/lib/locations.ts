// AUTO-PORTED from ../../../src/config/cityRoutes.js (SEO_COUNTRIES).
// Keep in sync via scripts/sync-taxonomy.mjs. Location matching uses
// `matchTerms` against the listing's free-text `location` string.

export type City = { slug: string; name: string; matchTerms: string[] };
export type Country = { slug: string; name: string; cities: City[] };

export const COUNTRIES: Country[] = [
  {
    slug: 'ethiopia',
    name: 'Ethiopia',
    cities: [
      { slug: 'addis-ababa', name: 'Addis Ababa', matchTerms: ['Addis Ababa', 'Addis'] },
      { slug: 'dire-dawa', name: 'Dire Dawa', matchTerms: ['Dire Dawa'] },
      { slug: 'mekelle', name: 'Mekelle', matchTerms: ['Mekelle', 'Mekele'] },
      { slug: 'gondar', name: 'Gondar', matchTerms: ['Gondar', 'Gonder'] },
    ],
  },
  {
    slug: 'kenya',
    name: 'Kenya',
    cities: [
      { slug: 'nairobi', name: 'Nairobi', matchTerms: ['Nairobi'] },
      { slug: 'mombasa', name: 'Mombasa', matchTerms: ['Mombasa'] },
      { slug: 'kisumu', name: 'Kisumu', matchTerms: ['Kisumu'] },
      { slug: 'nakuru', name: 'Nakuru', matchTerms: ['Nakuru'] },
    ],
  },
  {
    slug: 'nigeria',
    name: 'Nigeria',
    cities: [
      { slug: 'lagos', name: 'Lagos', matchTerms: ['Lagos'] },
      { slug: 'abuja', name: 'Abuja', matchTerms: ['Abuja'] },
      { slug: 'kano', name: 'Kano', matchTerms: ['Kano'] },
      { slug: 'ibadan', name: 'Ibadan', matchTerms: ['Ibadan'] },
      { slug: 'port-harcourt', name: 'Port Harcourt', matchTerms: ['Port Harcourt'] },
    ],
  },
  {
    slug: 'ghana',
    name: 'Ghana',
    cities: [
      { slug: 'accra', name: 'Accra', matchTerms: ['Accra'] },
      { slug: 'kumasi', name: 'Kumasi', matchTerms: ['Kumasi'] },
      { slug: 'tamale', name: 'Tamale', matchTerms: ['Tamale'] },
      { slug: 'takoradi', name: 'Takoradi', matchTerms: ['Takoradi', 'Sekondi'] },
    ],
  },
];

export const COUNTRY_BY_SLUG: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.slug, c]),
);

export function getCountry(slug: string): Country | undefined {
  return COUNTRY_BY_SLUG[slug];
}
export function getCity(countrySlug: string, citySlug: string): City | undefined {
  return getCountry(countrySlug)?.cities.find((c) => c.slug === citySlug);
}
