'use strict';
/**
 * OpenStreetMap / Overpass connector (CODE connector, load() hook).
 *
 * Africa-wide businesses/services/shops/food/tourism/education/health across
 * ~30 major cities in 20+ countries — open data (ODbL; © OpenStreetMap
 * contributors, attribution via sourceUrl). Spans many Sabalist categories:
 * food, services, electronics, phones, computers, home-furniture, fashion,
 * beauty, vehicles, agriculture, business, travel, education, sports-fitness.
 *
 * Uses load() to query each city separately (smaller, timeout-safe queries),
 * rate-limited — instead of one giant query. Engine is unchanged.
 */
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const RADIUS = 3000;
const PER_CITY = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Africa-first, 20+ countries. [city, lat, lon, country].
const CITIES = [
  ['Lagos', 6.4541, 3.3947, 'Nigeria'], ['Abuja', 9.0579, 7.4951, 'Nigeria'],
  ['Port Harcourt', 4.8156, 7.0498, 'Nigeria'], ['Kano', 12.0022, 8.592, 'Nigeria'],
  ['Nairobi', -1.2864, 36.8172, 'Kenya'], ['Mombasa', -4.0435, 39.6682, 'Kenya'],
  ['Accra', 5.6037, -0.187, 'Ghana'], ['Kumasi', 6.6886, -1.6244, 'Ghana'],
  ['Addis Ababa', 9.03, 38.74, 'Ethiopia'],
  ['Johannesburg', -26.2041, 28.0473, 'South Africa'], ['Cape Town', -33.9249, 18.4241, 'South Africa'],
  ['Durban', -29.8587, 31.0218, 'South Africa'],
  ['Cairo', 30.0444, 31.2357, 'Egypt'], ['Casablanca', 33.5731, -7.5898, 'Morocco'],
  ['Dar es Salaam', -6.7924, 39.2083, 'Tanzania'], ['Kampala', 0.3476, 32.5825, 'Uganda'],
  ['Dakar', 14.7167, -17.4677, 'Senegal'], ['Abidjan', 5.36, -4.0083, "Cote d'Ivoire"],
  ['Kinshasa', -4.4419, 15.2663, 'DR Congo'], ['Luanda', -8.839, 13.2894, 'Angola'],
  ['Khartoum', 15.5007, 32.5599, 'Sudan'], ['Tunis', 36.8065, 10.1815, 'Tunisia'],
  ['Algiers', 36.7538, 3.0588, 'Algeria'], ['Kigali', -1.9441, 30.0619, 'Rwanda'],
  ['Lusaka', -15.3875, 28.3228, 'Zambia'], ['Harare', -17.8252, 31.0335, 'Zimbabwe'],
  ['Maputo', -25.9692, 32.5732, 'Mozambique'], ['Windhoek', -22.5609, 17.0658, 'Namibia'],
  ['Bamako', 12.6392, -8.0029, 'Mali'], ['Douala', 4.0511, 9.7679, 'Cameroon'],
  ['Ibadan', 7.3776, 3.9470, 'Nigeria'], ['Kigali', -1.9536, 30.0606, 'Rwanda'],
  ['Lome', 6.1375, 1.2123, 'Togo'], ['Cotonou', 6.3703, 2.3912, 'Benin'],
  ['Conakry', 9.6412, -13.5784, 'Guinea'], ['Freetown', 8.4657, -13.2317, 'Sierra Leone'],
  ['Pretoria', -25.7479, 28.2293, 'South Africa'], ['Mombasa', -4.0435, 39.6682, 'Kenya'],
  ['Alexandria', 31.2001, 29.9187, 'Egypt'], ['Marrakech', 31.6295, -7.9811, 'Morocco'],
];

const SHOP_MAP = {
  mobile_phone: 'phones-tablets', computer: 'computers',
  electronics: 'electronics', hifi: 'electronics', radiotechnics: 'electronics',
  furniture: 'home-furniture', bed: 'home-furniture', kitchen: 'home-furniture', interior_decoration: 'home-furniture',
  clothes: 'fashion', shoes: 'fashion', boutique: 'fashion', fashion: 'fashion', bag: 'fashion', jewelry: 'fashion', watches: 'fashion',
  beauty: 'beauty', hairdresser: 'beauty', cosmetics: 'beauty', perfumery: 'beauty',
  supermarket: 'food', convenience: 'food', greengrocer: 'food', butcher: 'food', bakery: 'food', deli: 'food',
  car: 'vehicles', car_parts: 'vehicles', motorcycle: 'vehicles', tyres: 'vehicles',
  car_repair: 'repair-services', electronics_repair: 'repair-services', mobile_phone_repair: 'repair-services',
  hardware: 'construction', doityourself: 'construction', trade: 'construction', building_materials: 'construction',
  toys: 'baby-kids', baby_goods: 'baby-kids', sports: 'sports-fitness', outdoor: 'sports-fitness',
  pet: 'animals-pets', florist: 'agriculture', farm: 'agriculture', garden_centre: 'agriculture', agrarian: 'agriculture',
  variety_store: 'services', general: 'services', wholesale: 'business-industrial',
};
const AMENITY_MAP = {
  restaurant: 'food', cafe: 'food', fast_food: 'food', marketplace: 'food', food_court: 'food',
  fuel: 'vehicles',
  school: 'education', college: 'education', university: 'education', kindergarten: 'baby-kids',
  pharmacy: 'services', hospital: 'services', clinic: 'services', bank: 'services',
  veterinary: 'animals-pets',
  cinema: 'entertainment', theatre: 'entertainment', nightclub: 'entertainment', arts_centre: 'entertainment',
  community_centre: 'community', place_of_worship: 'community', library: 'community', social_facility: 'community', townhall: 'community',
};
const TOURISM_MAP = { hotel: 'travel', guest_house: 'travel', hostel: 'travel', attraction: 'travel', museum: 'travel' };

function categoryFor(tags) {
  if (tags.shop) return SHOP_MAP[tags.shop] || 'services';
  if (tags.tourism) return TOURISM_MAP[tags.tourism] || 'travel';
  if (tags.office === 'estate_agent') return 'real-estate';
  if (tags.craft) return 'repair-services';
  if (/^(fitness_centre|sports_centre|stadium|pitch|sports_hall)$/.test(tags.leisure || '')) return 'sports-fitness';
  if (tags.amenity) return AMENITY_MAP[tags.amenity] || 'services';
  return 'services';
}
function titleCaseWord(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }

function cityQuery(lat, lon) {
  const a = 'restaurant|cafe|fast_food|marketplace|pharmacy|fuel|bank|hospital|clinic|school|college|university|kindergarten|veterinary|cinema|theatre|nightclub|arts_centre|community_centre|place_of_worship|library|social_facility|townhall';
  const t = 'hotel|guest_house|hostel|attraction|museum';
  const l = 'fitness_centre|sports_centre|stadium|sports_hall';
  return `[out:json][timeout:60];(` +
    `node[shop](around:${RADIUS},${lat},${lon});` +
    `node[amenity~"^(${a})$"](around:${RADIUS},${lat},${lon});` +
    `node[tourism~"^(${t})$"](around:${RADIUS},${lat},${lon});` +
    `node[leisure~"^(${l})$"](around:${RADIUS},${lat},${lon});` +
    `node[craft](around:${RADIUS},${lat},${lon});` +
    `node[office=estate_agent](around:${RADIUS},${lat},${lon});` +
    `);out center ${PER_CITY};`;
}

module.exports = {
  source: {
    id: 'osm-africa-businesses',
    name: 'OpenStreetMap — Africa businesses/services/tourism/education (Overpass, ODbL)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'OpenStreetMap (ODbL) — © OpenStreetMap contributors; attribution via sourceUrl.',
    thresholds: { autoPublishQuality: 0.55, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', location: 'location', country: 'country',
      phoneNumber: 'phoneNumber', url: 'url', priceType: { const: 'none' },
    },

    async load({ httpRequest, opts }) {
      const out = [];
      for (const [city, lat, lon, country] of CITIES) {
        try {
          const body = `data=${encodeURIComponent(cityQuery(lat, lon))}`;
          const raw = await httpRequest(OVERPASS, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const els = (JSON.parse(raw).elements) || [];
          for (const el of els) {
            const tags = el.tags || {};
            const name = tags.name || tags['name:en'];
            if (!name) continue;
            const kind = titleCaseWord(tags.shop || tags.tourism || tags.amenity || tags.leisure || 'business');
            const street = tags['addr:street'] ? `, ${tags['addr:street']}` : '';
            out.push({
              externalId: `osm-${el.type}-${el.id}`,
              title: name,
              description: `${kind} in ${city}, ${country}${street}. Listing sourced from OpenStreetMap (© OpenStreetMap contributors).`,
              category: categoryFor(tags),
              location: `${city}, ${country}`,
              country,
              phoneNumber: tags.phone || tags['contact:phone'] || '',
              url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
            });
          }
        } catch (e) {
          // per-city failure is non-fatal; keep going
        }
        await sleep(1000); // be polite to Overpass
        if (opts && opts.limit && out.length >= opts.limit * 3) break; // keep test runs short
      }
      return out;
    },
  },
};
