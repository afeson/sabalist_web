'use strict';
/**
 * OpenStreetMap / Overpass connector (CODE connector).
 *
 * Pulls real businesses/services/shops/food across priority AFRICAN cities from
 * OpenStreetMap — genuinely open data (ODbL; attribution "© OpenStreetMap
 * contributors" preserved via sourceUrl). Spans many Sabalist categories:
 * food, services, electronics, phones, computers, home-furniture, fashion,
 * beauty, vehicles, agriculture, business-industrial, animals-pets.
 *
 * Demonstrates the universal connector system handling a non-trivial source
 * (POST query, multi-city, tag→category mapping) with ZERO engine changes —
 * just a config + transform().
 */

// Africa first. [name, lat, lon, country].
const CITIES = [
  ['Lagos', 6.4541, 3.3947, 'Nigeria'],
  ['Nairobi', -1.2864, 36.8172, 'Kenya'],
  ['Accra', 5.6037, -0.1870, 'Ghana'],
  ['Addis Ababa', 9.0300, 38.7400, 'Ethiopia'],
  ['Johannesburg', -26.2041, 28.0473, 'South Africa'],
];
const AMENITIES = 'restaurant|cafe|fast_food|marketplace|pharmacy|fuel|bank';
const RADIUS = 2500;

function buildQuery() {
  const parts = CITIES.map(([, lat, lon]) =>
    `node[shop](around:${RADIUS},${lat},${lon});node[amenity~"^(${AMENITIES})$"](around:${RADIUS},${lat},${lon});`
  ).join('');
  return `[out:json][timeout:90];(${parts});out center 250;`;
}

function nearestCity(lat, lon) {
  let best = CITIES[0], bestD = Infinity;
  for (const c of CITIES) {
    const d = (c[1] - lat) ** 2 + (c[2] - lon) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return { city: best[0], country: best[3] };
}

const SHOP_MAP = {
  mobile_phone: 'phones-tablets', computer: 'computers',
  electronics: 'electronics', hifi: 'electronics', radiotechnics: 'electronics',
  furniture: 'home-furniture', bed: 'home-furniture', kitchen: 'home-furniture', interior_decoration: 'home-furniture',
  clothes: 'fashion', shoes: 'fashion', boutique: 'fashion', fashion: 'fashion', bag: 'fashion', jewelry: 'fashion', watches: 'fashion',
  beauty: 'beauty', hairdresser: 'beauty', cosmetics: 'beauty', perfumery: 'beauty',
  supermarket: 'food', convenience: 'food', greengrocer: 'food', butcher: 'food', bakery: 'food', deli: 'food',
  car: 'vehicles', car_repair: 'vehicles', car_parts: 'vehicles', motorcycle: 'vehicles', tyres: 'vehicles',
  hardware: 'business-industrial', doityourself: 'business-industrial', trade: 'business-industrial', building_materials: 'business-industrial',
  pet: 'animals-pets', florist: 'agriculture', farm: 'agriculture', garden_centre: 'agriculture', agrarian: 'agriculture',
};
const AMENITY_MAP = {
  restaurant: 'food', cafe: 'food', fast_food: 'food', marketplace: 'food', food_court: 'food',
  fuel: 'vehicles',
};

function categoryFor(tags) {
  if (tags.shop) return SHOP_MAP[tags.shop] || 'services';
  if (tags.amenity) return AMENITY_MAP[tags.amenity] || 'services';
  return 'services';
}

function titleCaseWord(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }

module.exports = {
  source: {
    id: 'osm-africa-businesses',
    name: 'OpenStreetMap — African businesses & services (Overpass, ODbL)',
    enabled: true,
    format: 'json',
    fetch: {
      type: 'http',
      method: 'POST',
      url: 'https://overpass-api.de/api/interpreter',
      headers: { Accept: 'application/json' },
      form: { data: buildQuery() },
    },
    parseOptions: { recordsPath: 'elements' },
    schedule: '0 */6 * * *',
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'OpenStreetMap (ODbL) — © OpenStreetMap contributors; attribution via sourceUrl.',
    // Directory entries legitimately lack price/photos, so allow a lower bar.
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId',
      title: 'title',
      description: 'description',
      category: 'category',
      location: 'location',
      country: 'country',
      phoneNumber: 'phoneNumber',
      url: 'url',
      priceType: { const: 'none' },
    },
  },

  // Convert raw Overpass elements → clean Sabalist-shaped records.
  transform(elements) {
    const out = [];
    for (const el of elements || []) {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) continue; // skip unnamed POIs
      const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
      const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
      const { city, country } = lat != null ? nearestCity(lat, lon) : { city: '', country: '' };
      const kind = titleCaseWord(tags.shop || tags.amenity || 'business');
      const street = tags['addr:street'] ? `, ${tags['addr:street']}` : '';
      out.push({
        externalId: `osm-${el.type}-${el.id}`,
        title: name,
        description: `${kind} in ${city}, ${country}${street}. Business listing sourced from OpenStreetMap (© OpenStreetMap contributors).`,
        category: categoryFor(tags),
        location: `${city}, ${country}`,
        country,
        phoneNumber: tags.phone || tags['contact:phone'] || '',
        url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      });
    }
    return out;
  },
};
