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
const { VALID_SUBS } = require('../lib/taxonomy');
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

// --- OSM tag value -> [categoryId, subcategoryId] ---------------------------
// Each entry maps a raw OSM shop=/amenity=/tourism=/leisure= value to BOTH the
// Sabalist category AND a precise subcategory. Subcategories are validated at
// emit time (see emitFor) against the canonical taxonomy in ingestion/lib/
// taxonomy.js, so a typo or stale sub silently falls back to category-only.
const SHOP_MAP = {
  // phones & tablets
  mobile_phone: ['phones-tablets', 'smartphones'], telephone: ['phones-tablets', 'smartphones'],
  // computers
  computer: ['computers', 'laptops'], electronics_repair: ['repair-services', 'phone-repair'],
  // electronics
  electronics: ['electronics', 'accessories'], hifi: ['electronics', 'audio-speakers'],
  radiotechnics: ['electronics', 'audio-speakers'], camera: ['electronics', 'cameras'],
  video: ['electronics', 'tvs'], video_games: ['electronics', 'gaming-consoles'],
  appliance: ['home-furniture', 'home-appliances'],
  // home & furniture
  furniture: ['home-furniture', 'sofas-chairs'], bed: ['home-furniture', 'beds-mattresses'],
  kitchen: ['home-furniture', 'kitchen'], interior_decoration: ['home-furniture', 'decor'],
  houseware: ['home-furniture', 'decor'], curtain: ['home-furniture', 'decor'],
  bathroom_furnishing: ['home-furniture', 'decor'], carpet: ['home-furniture', 'decor'],
  electrical: ['home-furniture', 'home-appliances'], lighting: ['home-furniture', 'decor'],
  // fashion
  clothes: ['fashion', 'womens-clothing'], boutique: ['fashion', 'womens-clothing'],
  fashion: ['fashion', 'womens-clothing'], shoes: ['fashion', 'shoes'], bag: ['fashion', 'bags'],
  jewelry: ['fashion', 'watches-jewelry'], watches: ['fashion', 'watches-jewelry'],
  leather: ['fashion', 'bags'], tailor: ['fashion', 'traditional-wear'],
  fabric: ['fashion', 'traditional-wear'], sewing: ['fashion', 'traditional-wear'],
  // beauty
  beauty: ['beauty', 'beauty-tools'], hairdresser: ['beauty', 'haircare'],
  cosmetics: ['beauty', 'makeup'], perfumery: ['beauty', 'fragrances'],
  chemist: ['beauty', 'skincare'], massage: ['beauty', 'beauty-tools'],
  // food
  supermarket: ['food', 'groceries'], convenience: ['food', 'groceries'],
  greengrocer: ['food', 'groceries'], butcher: ['food', 'groceries'], deli: ['food', 'groceries'],
  seafood: ['food', 'groceries'], dairy: ['food', 'groceries'], grocery: ['food', 'groceries'],
  provision: ['food', 'groceries'], spices: ['food', 'groceries'], honey: ['food', 'groceries'],
  bakery: ['food', 'bakery'], pastry: ['food', 'bakery'], confectionery: ['food', 'bakery'],
  beverages: ['food', 'beverages'], coffee: ['food', 'beverages'], tea: ['food', 'beverages'],
  wine: ['food', 'beverages'], alcohol: ['food', 'beverages'],
  // vehicles
  car: ['vehicles', 'cars'], car_parts: ['vehicles', 'spare-parts'],
  motorcycle: ['vehicles', 'motorcycles'], tyres: ['vehicles', 'spare-parts'],
  bicycle: ['vehicles', 'bicycles'],
  boat: ['vehicles', 'boats'], truck: ['vehicles', 'trucks'],
  car_repair: ['repair-services', 'car-repair'], mobile_phone_repair: ['repair-services', 'phone-repair'],
  // construction
  hardware: ['construction', 'building-materials'], doityourself: ['construction', 'power-tools'],
  trade: ['construction', 'building-materials'], building_materials: ['construction', 'building-materials'],
  glaziery: ['construction', 'building-materials'],
  paint: ['construction', 'building-materials'],
  // rentals — equipment-hire businesses (not product subs)
  tool_hire: ['rentals', 'equipment-rentals'],
  // baby & kids
  toys: ['baby-kids', 'toys'], baby_goods: ['baby-kids', 'baby-clothing'],
  // sports & fitness
  sports: ['sports-fitness', 'gym-equipment'], outdoor: ['sports-fitness', 'outdoor'],
  water_sports: ['sports-fitness', 'outdoor'],
  // agriculture
  florist: ['agriculture', 'crops'], farm: ['agriculture', 'farm-equipment'],
  garden_centre: ['agriculture', 'farm-equipment'], agrarian: ['agriculture', 'farm-equipment'],
  // pets
  pet: ['animals-pets', 'pet-accessories'],
  // entertainment
  musical_instrument: ['entertainment', 'instruments'], music: ['entertainment', 'music'],
  art: ['entertainment', 'art-collectibles'], games: ['entertainment', 'games'],
  cds: ['entertainment', 'music'],
  // education
  books: ['education', 'books'],
  newsagent: ['education', 'books'],
  // business-industrial
  wholesale: ['business-industrial', 'wholesale'],
  stationery: ['business-industrial', 'office-equipment'],
  copyshop: ['business-industrial', 'office-equipment'],
  printer_ink: ['business-industrial', 'office-equipment'],
  // services (shops that are really storefront services, not product subs)
  variety_store: ['services', 'cleaning'], general: ['services', 'cleaning'],
  department_store: ['services', 'cleaning'], mall: ['services', 'cleaning'],
  kiosk: ['food', 'groceries'], gift: ['services', 'cleaning'],
  optician: ['services', 'cleaning'], travel_agency: ['travel', 'tours'],
  dry_cleaning: ['services', 'cleaning'], laundry: ['services', 'cleaning'],
  photo: ['services', 'photography'], photo_studio: ['services', 'photography'],
  medical_supply: ['services', 'cleaning'], funeral_directors: ['services', 'cleaning'],
  ticket: ['events-tickets', 'concerts'], pawnbroker: ['services', 'cleaning'],
  money_lender: ['services', 'cleaning'], insurance: ['services', 'cleaning'],
  estate_agent: ['real-estate', 'houses-rent'],
};
const AMENITY_MAP = {
  restaurant: ['food', 'restaurants'], cafe: ['food', 'restaurants'],
  fast_food: ['food', 'restaurants'], food_court: ['food', 'restaurants'],
  marketplace: ['food', 'groceries'],
  fuel: ['vehicles', 'spare-parts'],
  car_rental: ['rentals', 'car-rentals'],
  school: ['education', 'courses'], college: ['education', 'courses'],
  university: ['education', 'courses'], kindergarten: ['baby-kids', 'school-supplies'],
  // vocational / specialist schools — fill the (empty) education/tutoring sub
  driving_school: ['education', 'tutoring-edu'], language_school: ['education', 'tutoring-edu'],
  music_school: ['education', 'tutoring-edu'], training: ['education', 'tutoring-edu'],
  pharmacy: ['services', 'cleaning'], hospital: ['services', 'cleaning'],
  clinic: ['services', 'cleaning'], bank: ['services', 'cleaning'],
  veterinary: ['animals-pets', 'pet-accessories'],
  cinema: ['entertainment', 'movies'], theatre: ['entertainment', 'art-collectibles'],
  nightclub: ['entertainment', 'music'], arts_centre: ['entertainment', 'art-collectibles'],
  community_centre: ['community', 'announcements'], place_of_worship: ['community', 'announcements'],
  library: ['community', 'announcements'], social_facility: ['community', 'volunteers'],
  townhall: ['community', 'announcements'],
};
const TOURISM_MAP = {
  hotel: ['travel', 'hotels'], guest_house: ['travel', 'hotels'], hostel: ['travel', 'hotels'],
  attraction: ['travel', 'tours'], museum: ['travel', 'tours'], viewpoint: ['travel', 'tours'],
};
const LEISURE_MAP = {
  fitness_centre: ['sports-fitness', 'gym-equipment'], sports_centre: ['sports-fitness', 'gym-equipment'],
  stadium: ['sports-fitness', 'team-sports'], sports_hall: ['sports-fitness', 'team-sports'],
  pitch: ['sports-fitness', 'team-sports'],
};
// craft=* — tradespeople / workshops. Most are repair or trade services; a few
// route to construction/services. Unmapped craft values fall back to
// ['repair-services', null] (category-only) to preserve prior behaviour.
const CRAFT_MAP = {
  water_well_drilling: ['construction', 'drilling-machines'],
  plumber: ['repair-services', 'plumbing-repair'],
  mobile_phone: ['repair-services', 'phone-repair'],
  electronics_repair: ['repair-services', 'electrical-repair'],
  electrician: ['services', 'electrical'],
};

// shop=agrarian carries an `agrarian=*` subkey describing what the farm-supply
// store sells. Route to the precise agriculture subcategory by that subkey, so
// seed/fertilizer/feed stores fill their (otherwise empty) subs rather than all
// collapsing into farm-equipment. Falls back to crops when the subkey is absent.
function agrarianSub(tags) {
  const v = String(tags.agrarian || '').toLowerCase();
  if (!v) return 'crops';
  // agrarian can be a semicolon list; inspect the parts.
  const parts = v.split(';').map((s) => s.trim());
  const has = (k) => parts.includes(k);
  if (has('seed') || has('seeds')) return 'seeds';
  if (has('fertilizer') || has('fertiliser')) return 'fertilizers';
  if (has('feed') || has('animal_feed')) return 'livestock-feed';
  if (has('agricultural_machinery') || has('machine_parts') || has('tools')) return 'farm-equipment';
  return 'crops';
}

// Resolve [category, subcategory] for a tag set. Returns category-only ['services']
// when no precise mapping exists, so behaviour degrades safely.
function mapFor(tags) {
  if (tags.shop === 'agrarian') return ['agriculture', agrarianSub(tags)];
  if (tags.shop) return SHOP_MAP[tags.shop] || ['services', null];
  if (tags.tourism) return TOURISM_MAP[tags.tourism] || ['travel', null];
  if (tags.office === 'estate_agent') return ['real-estate', 'houses-rent'];
  if (tags.office === 'educational_institution') return ['education', 'tutoring-edu'];
  if (tags.craft) return CRAFT_MAP[tags.craft] || ['repair-services', null];
  if (tags.leisure && LEISURE_MAP[tags.leisure]) return LEISURE_MAP[tags.leisure];
  if (tags.amenity) return AMENITY_MAP[tags.amenity] || ['services', null];
  return ['services', null];
}

function categoryFor(tags) { return mapFor(tags)[0]; }

// Resolve a validated [category, subcategory] pair. The subcategory is dropped
// (left empty) unless it is a real sub of the resolved category in the canonical
// taxonomy — guarding against a stale entry in the maps above. When dropped, the
// pipeline's text classifier still assigns a sub downstream.
function categorySubFor(tags) {
  const [cat, sub] = mapFor(tags);
  const valid = sub && VALID_SUBS[cat] && VALID_SUBS[cat].has(sub) ? sub : '';
  return [cat, valid];
}

function titleCaseWord(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }

function cityQuery(lat, lon) {
  const a = 'restaurant|cafe|fast_food|marketplace|pharmacy|fuel|car_rental|bank|hospital|clinic|school|college|university|kindergarten|driving_school|language_school|music_school|training|veterinary|cinema|theatre|nightclub|arts_centre|community_centre|place_of_worship|library|social_facility|townhall';
  const t = 'hotel|guest_house|hostel|attraction|museum';
  const l = 'fitness_centre|sports_centre|stadium|sports_hall';
  const o = 'estate_agent|educational_institution';
  return `[out:json][timeout:60];(` +
    `node[shop](around:${RADIUS},${lat},${lon});` +
    `node[amenity~"^(${a})$"](around:${RADIUS},${lat},${lon});` +
    `node[tourism~"^(${t})$"](around:${RADIUS},${lat},${lon});` +
    `node[leisure~"^(${l})$"](around:${RADIUS},${lat},${lon});` +
    `node[craft](around:${RADIUS},${lat},${lon});` +
    `node[office~"^(${o})$"](around:${RADIUS},${lat},${lon});` +
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
      category: 'category', subcategory: 'subcategory', location: 'location', country: 'country',
      phoneNumber: 'phoneNumber', website: 'website', email: 'email', url: 'url', priceType: { const: 'none' },
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
            const kind = titleCaseWord(tags.shop || tags.craft || tags.tourism || tags.amenity || tags.leisure || 'business');
            const street = tags['addr:street'] ? `, ${tags['addr:street']}` : '';
            const [category, subcategory] = categorySubFor(tags);
            out.push({
              externalId: `osm-${el.type}-${el.id}`,
              title: name,
              description: `${kind} in ${city}, ${country}${street}. Listing sourced from OpenStreetMap (© OpenStreetMap contributors).`,
              category,
              subcategory,
              location: `${city}, ${country}`,
              country,
              phoneNumber: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags.mobile || '',
              website: (() => { const w = tags.website || tags['contact:website'] || tags.url || ''; return /^https?:\/\//.test(w) ? w : (w ? 'https://' + w.replace(/^\/+/, '') : ''); })(),
              email: tags.email || tags['contact:email'] || '',
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

// --- Re-export the tag maps so back-office backfills can re-derive category +
// subcategory for ALREADY-IMPORTED OSM listings (whose description embeds the
// titleized OSM kind) WITHOUT re-crawling Overpass. Single source of truth. ---

// Resolve [category, subcategory] from a description "kind" (e.g. "Mobile Phone",
// "Camera", "Hardware") — the titleized OSM tag value stored at import time.
// Mirrors mapFor() but keyed by the underscored lower-cased tag value.
function mapForKind(kindText) {
  const key = String(kindText || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!key) return ['services', ''];
  const [cat, sub] = SHOP_MAP[key] || CRAFT_MAP[key] || AMENITY_MAP[key] || TOURISM_MAP[key] || LEISURE_MAP[key] || ['services', null];
  const valid = sub && VALID_SUBS[cat] && VALID_SUBS[cat].has(sub) ? sub : '';
  return [cat, valid];
}

module.exports.SHOP_MAP = SHOP_MAP;
module.exports.CRAFT_MAP = CRAFT_MAP;
module.exports.AMENITY_MAP = AMENITY_MAP;
module.exports.TOURISM_MAP = TOURISM_MAP;
module.exports.LEISURE_MAP = LEISURE_MAP;
module.exports.mapForKind = mapForKind;
