'use strict';
/**
 * OpenStreetMap — African DIASPORA businesses (Overpass, ODbL).
 *
 * Real African restaurants, grocers and shops in major diaspora cities
 * (London, Toronto, Atlanta, Washington DC, Houston, Minneapolis) — open data
 * (ODbL; attribution via sourceUrl). Populates "African diaspora listings"
 * across food / services / fashion. Same pattern as connectors/overpass.js.
 */
const CITIES = [
  ['London', 51.5074, -0.1278, 'United Kingdom'],
  ['Toronto', 43.6532, -79.3832, 'Canada'],
  ['Atlanta', 33.749, -84.388, 'United States'],
  ['Washington', 38.9072, -77.0369, 'United States'],
  ['Houston', 29.7604, -95.3698, 'United States'],
  ['Minneapolis', 44.9778, -93.265, 'United States'],
];
const CUISINE = 'african|ethiopian|nigerian|ghanaian|eritrean|somali|senegalese|kenyan';
const RADIUS = 8000;

function buildQuery() {
  // Keep it cheap (server-side timeout-safe): African-cuisine restaurants only.
  const parts = CITIES.map(([, lat, lon]) =>
    `node[amenity=restaurant][cuisine~"${CUISINE}"](around:${RADIUS},${lat},${lon});`
  ).join('');
  return `[out:json][timeout:60];(${parts});out center 200;`;
}
function nearestCity(lat, lon) {
  let best = CITIES[0], bestD = Infinity;
  for (const c of CITIES) { const d = (c[1] - lat) ** 2 + (c[2] - lon) ** 2; if (d < bestD) { bestD = d; best = c; } }
  return { city: best[0], country: best[3] };
}

module.exports = {
  source: {
    id: 'osm-diaspora-african',
    name: 'OpenStreetMap — African diaspora businesses (Overpass, ODbL)',
    enabled: true,
    format: 'json',
    fetch: {
      type: 'http', method: 'POST', url: 'https://overpass-api.de/api/interpreter',
      headers: { Accept: 'application/json' }, form: { data: buildQuery() },
    },
    parseOptions: { recordsPath: 'elements' },
    schedule: '0 */6 * * *',
    ownerUserId: 'imported-listings',
    region: 'Diaspora',
    license: 'OpenStreetMap (ODbL) — © OpenStreetMap contributors; attribution via sourceUrl.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', location: 'location', country: 'country',
      phoneNumber: 'phoneNumber', url: 'url', priceType: { const: 'none' },
    },
  },
  transform(elements) {
    const out = [];
    for (const el of elements || []) {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) continue;
      const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
      const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
      const { city, country } = lat != null ? nearestCity(lat, lon) : { city: '', country: '' };
      const isFood = tags.amenity === 'restaurant';
      out.push({
        externalId: `osm-${el.type}-${el.id}`,
        title: name,
        description: `${isFood ? (tags.cuisine || 'African') + ' restaurant' : 'African grocery/shop'} in ${city}, ${country}. African diaspora business listing sourced from OpenStreetMap (© OpenStreetMap contributors).`,
        category: isFood ? 'food' : 'services',
        location: `${city}, ${country}`,
        country,
        phoneNumber: tags.phone || tags['contact:phone'] || '',
        url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      });
    }
    return out;
  },
};
