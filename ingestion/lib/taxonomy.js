'use strict';
/**
 * Sabalist category taxonomy + keyword-based auto-categorization.
 *
 * Category ids mirror src/config/categories.js (the app filters listings by the
 * lowercase `categoryId`). Keep this list in sync with that file. Each category
 * carries keyword cues used to auto-assign a category/subcategory when a source
 * doesn't provide one (or provides one we don't recognize).
 */

// Canonical top-level categories (id must match the app's category ids).
const CATEGORIES = [
  { id: 'real-estate', label: 'Real Estate',
    subs: ['houses-sale', 'houses-rent', 'apartments', 'commercial-property', 'land'],
    keywords: ['house', 'home', 'apartment', 'flat', 'condo', 'villa', 'rent', 'for sale', 'bedroom', 'studio', 'land', 'plot', 'acre', 'commercial property', 'office space', 'warehouse'] },
  { id: 'vehicles', label: 'Vehicles',
    subs: ['cars', 'motorcycles', 'trucks', 'buses', 'bicycles', 'boats', 'spare-parts'],
    keywords: ['car', 'sedan', 'suv', 'toyota', 'honda', 'bmw', 'mercedes', 'motorcycle', 'bike', 'truck', 'lorry', 'bus', 'boat', 'yacht', 'auto part', 'spare part', 'tyre', 'mileage', 'engine'] },
  { id: 'electronics', label: 'Electronics',
    subs: ['tvs', 'audio-speakers', 'cameras', 'gaming-consoles', 'accessories'],
    keywords: ['tv', 'television', 'speaker', 'camera', 'playstation', 'xbox', 'console', 'headphone', 'electronic'] },
  { id: 'phones-tablets', label: 'Phones & Tablets',
    subs: ['phones', 'tablets', 'accessories'],
    keywords: ['phone', 'smartphone', 'iphone', 'samsung galaxy', 'tablet', 'ipad', 'android'] },
  { id: 'computers', label: 'Computers',
    subs: ['laptops', 'desktops', 'accessories', 'networking'],
    keywords: ['laptop', 'desktop', 'computer', 'pc', 'macbook', 'monitor', 'keyboard', 'router'] },
  { id: 'fashion', label: 'Fashion',
    subs: ['mens-clothing', 'womens-clothing', 'shoes', 'bags', 'watches-jewelry'],
    keywords: ['clothing', 'dress', 'shirt', 'shoes', 'sneaker', 'bag', 'handbag', 'watch', 'jewelry', 'fashion'] },
  { id: 'beauty', label: 'Beauty',
    subs: ['skincare', 'makeup', 'hair', 'fragrance'],
    keywords: ['beauty', 'makeup', 'skincare', 'cosmetic', 'perfume', 'wig', 'hair'] },
  { id: 'home-furniture', label: 'Home & Furniture',
    subs: ['sofas', 'beds', 'tables', 'appliances', 'decor'],
    keywords: ['furniture', 'sofa', 'couch', 'bed', 'mattress', 'table', 'chair', 'fridge', 'refrigerator', 'washing machine', 'decor'] },
  { id: 'jobs', label: 'Jobs',
    subs: ['full-time', 'part-time', 'freelance', 'internships', 'remote'],
    keywords: ['job', 'hiring', 'vacancy', 'position', 'salary', 'full-time', 'part-time', 'internship', 'recruit', 'employment'] },
  { id: 'services', label: 'Services',
    subs: ['cleaning', 'electrical', 'plumbing', 'repair', 'tutoring', 'design'],
    keywords: ['service', 'cleaning', 'plumber', 'electrician', 'repair', 'tutor', 'design', 'consulting'] },
  { id: 'agriculture', label: 'Agriculture',
    subs: ['crops', 'equipment', 'seeds', 'produce'],
    keywords: ['farm', 'agriculture', 'crop', 'tractor', 'seed', 'harvest', 'fertilizer', 'produce'] },
  { id: 'animals-pets', label: 'Animals & Pets',
    subs: ['dogs', 'cats', 'birds', 'livestock', 'accessories'],
    keywords: ['dog', 'puppy', 'cat', 'kitten', 'pet', 'bird', 'goat', 'cattle', 'cow', 'sheep', 'poultry', 'livestock'] },
  { id: 'business-industrial', label: 'Business & Industrial',
    subs: ['construction-equipment', 'business-opportunities', 'machinery', 'supplies'],
    keywords: ['construction equipment', 'excavator', 'generator', 'machinery', 'industrial', 'business opportunity', 'franchise'] },
  { id: 'events-tickets', label: 'Events & Tickets',
    subs: ['concerts', 'community', 'sports', 'workshops'],
    keywords: ['event', 'ticket', 'concert', 'festival', 'workshop', 'community event', 'meetup'] },
  { id: 'baby-kids', label: 'Baby & Kids',
    subs: ['toys', 'clothing', 'gear', 'furniture'],
    keywords: ['baby', 'kids', 'toy', 'stroller', 'diaper', 'children'] },
  { id: 'food', label: 'Food',
    subs: ['groceries', 'restaurants', 'catering'],
    keywords: ['food', 'grocery', 'restaurant', 'catering', 'meal'] },
  { id: 'education', label: 'Education',
    subs: ['universities', 'colleges', 'schools', 'training', 'tutoring'],
    keywords: ['university', 'universities', 'college', 'school', 'institute', 'polytechnic', 'academy', 'education', 'campus'] },
  { id: 'travel', label: 'Travel',
    subs: ['hotels', 'attractions', 'tours', 'guesthouses'],
    keywords: ['hotel', 'guesthouse', 'lodge', 'resort', 'tour', 'travel', 'attraction', 'museum', 'safari', 'tourism'] },
  { id: 'sports-fitness', label: 'Sports & Fitness',
    subs: ['gyms', 'equipment', 'clubs'],
    keywords: ['gym', 'fitness', 'stadium', 'sports', 'football', 'workout'] },
  { id: 'rentals', label: 'Rentals',
    subs: ['apartments', 'houses-rent', 'rooms', 'short-let'],
    keywords: ['for rent', 'to let', 'rental', 'apartment', 'short let', 'bedroom flat'] },
  { id: 'entertainment', label: 'Entertainment',
    subs: ['cinema', 'theatre', 'nightlife', 'arts'],
    keywords: ['cinema', 'theatre', 'theater', 'nightclub', 'arts centre', 'entertainment'] },
  { id: 'community', label: 'Community',
    subs: ['centres', 'worship', 'libraries', 'nonprofit'],
    keywords: ['community centre', 'church', 'mosque', 'temple', 'library', 'community'] },
  { id: 'construction', label: 'Construction',
    subs: ['materials', 'equipment', 'contractors'],
    keywords: ['construction', 'hardware', 'building materials', 'cement', 'contractor'] },
  { id: 'repair-services', label: 'Repair Services',
    subs: ['auto-repair', 'electronics-repair', 'home-repair'],
    keywords: ['repair', 'mechanic', 'plumber', 'electrician', 'fix', 'workshop'] },
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const SUB_IDS = new Set(CATEGORIES.flatMap((c) => c.subs));

// Common aliases sources use → our category id.
const CATEGORY_ALIASES = {
  property: 'real-estate', 'real estate': 'real-estate', housing: 'real-estate', homes: 'real-estate',
  autos: 'vehicles', cars: 'vehicles', automotive: 'vehicles', 'motors': 'vehicles',
  mobile: 'phones-tablets', phones: 'phones-tablets', cellphones: 'phones-tablets',
  it: 'computers', laptops: 'computers',
  clothing: 'fashion', apparel: 'fashion',
  pets: 'animals-pets', livestock: 'animals-pets', animals: 'animals-pets',
  employment: 'jobs', careers: 'jobs',
  furniture: 'home-furniture', 'home & garden': 'home-furniture', appliances: 'home-furniture',
  farming: 'agriculture',
};

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

/**
 * Resolve a source-provided category string to a canonical category id, or null.
 */
function resolveCategory(raw) {
  const n = normalize(raw);
  if (!n) return null;
  if (CATEGORY_IDS.has(n)) return n;
  const slug = n.replace(/[\s_]+/g, '-');
  if (CATEGORY_IDS.has(slug)) return slug;
  if (CATEGORY_ALIASES[n]) return CATEGORY_ALIASES[n];
  return null;
}

/**
 * Auto-categorize from free text (title + description). Returns
 * { categoryId, subcategory, confidence } — confidence in [0,1].
 */
function categorize({ title = '', description = '', rawCategory = '' } = {}) {
  // 1) Trust an explicit, recognized source category first.
  const explicit = resolveCategory(rawCategory);
  if (explicit) return { categoryId: explicit, subcategory: null, confidence: 0.95 };

  // 2) Keyword scoring over text.
  const text = `${normalize(title)} ${normalize(description)}`;
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) score += kw.includes(' ') ? 2 : 1; // multi-word cues weigh more
    }
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  if (!best) return { categoryId: null, subcategory: null, confidence: 0 };

  // Try a subcategory by matching its slug words in text.
  let sub = null;
  for (const s of best.subs) {
    const words = s.split('-');
    if (words.every((w) => text.includes(w))) { sub = s; break; }
  }
  // Confidence scales with keyword hits, capped.
  const confidence = Math.min(0.9, 0.4 + bestScore * 0.12);
  return { categoryId: best.id, subcategory: sub, confidence };
}

// Per-category keyword → subcategory rules (kept in sync with
// scripts/backfill-subcategories.js). Used at ingest time so every imported
// listing lands in a subcategory section, not just a category.
const VALID_SUBS = Object.fromEntries(CATEGORIES.map((c) => [c.id, new Set(c.subs)]));
const SUB_RULES = {
  vehicles: [[/motorcycle|scooter|\bbike\b|moped/, 'motorcycles'], [/truck|lorry|trailer|pickup/, 'trucks'], [/\bbus\b|coaster|minibus/, 'buses'], [/bicycle|cycling/, 'bicycles'], [/boat|yacht|canoe|jetski/, 'boats'], [/spare|tyre|tire|\bpart|engine|battery|rim/, 'spare-parts'], [/./, 'cars']],
  'real-estate': [[/\bland\b|plot|acre/, 'land'], [/office|shop|commercial|warehouse/, 'commercial-property'], [/short.?let|short stay|nightly/, 'short-let'], [/for sale|\bsale\b/, 'houses-sale'], [/apartment|flat|condo|studio/, 'apartments'], [/./, 'houses-rent']],
  electronics: [[/\btv\b|television/, 'tvs'], [/speaker|audio|headphone|earbud|soundbar/, 'audio-speakers'], [/camera|dslr|gopro|lens/, 'cameras'], [/playstation|\bps5\b|\bps4\b|xbox|nintendo|console/, 'gaming-consoles'], [/smart (home|device)|alexa|echo|iot/, 'smart-devices'], [/watch|wearable|fitbit|band/, 'wearables'], [/./, 'accessories']],
  'phones-tablets': [[/tablet|ipad/, 'tablets'], [/feature phone|keypad/, 'feature-phones'], [/\bsim\b/, 'sim-cards'], [/case|charger|cable|cover|accessor/, 'phone-accessories'], [/./, 'smartphones']],
  computers: [[/laptop|macbook|notebook|chromebook/, 'laptops'], [/desktop|tower|imac/, 'desktops'], [/\bram\b|\bcpu\b|\bgpu\b|motherboard|component|ssd/, 'components'], [/printer|scanner|toner/, 'printers'], [/router|network|switch|modem/, 'networking'], [/software|license|windows|antivirus/, 'software'], [/./, 'laptops']],
  fashion: [[/shoe|sneaker|boot|heel|sandal/, 'shoes'], [/\bbag\b|handbag|backpack|purse|wallet/, 'bags'], [/watch|jewel|ring|necklace|bracelet|earring/, 'watches-jewelry'], [/traditional|ankara|kente|dashiki|kaftan|abaya/, 'traditional-wear'], [/women|woman|ladies|dress|skirt|blouse/, 'womens-clothing'], [/\bmen\b|\bman\b|shirt|trouser|suit/, 'mens-clothing'], [/./, 'accessories']],
  beauty: [[/skin|lotion|cream|serum|moistur/, 'skincare'], [/makeup|lipstick|foundation|mascara/, 'makeup'], [/hair|shampoo|wig|conditioner|braid/, 'haircare'], [/perfume|fragrance|cologne|scent/, 'fragrances'], [/./, 'beauty-tools']],
  'home-furniture': [[/sofa|couch|chair|recliner/, 'sofas-chairs'], [/\bbed\b|mattress|bunk/, 'beds-mattresses'], [/table|desk/, 'tables-desks'], [/wardrobe|closet|dresser/, 'wardrobes'], [/kitchen|cookware|\bwok\b|\bpot\b|\bpan\b|utensil/, 'kitchen'], [/fridge|refrigerator|washing machine|microwave|appliance|blender|oven/, 'home-appliances'], [/office/, 'office-furniture'], [/./, 'decor']],
  jobs: [[/part.?time/, 'part-time'], [/freelance|contract|gig/, 'freelance'], [/intern/, 'internships'], [/remote|work from home|wfh/, 'remote'], [/./, 'full-time']],
  services: [[/clean/, 'cleaning'], [/electric/, 'electrical'], [/plumb/, 'plumbing'], [/design|graphic|logo/, 'graphic-design'], [/tutor|lesson|teach/, 'tutoring'], [/photo|video|film/, 'photography'], [/salon|spa|barber|\bhair\b|\bnail\b|beauty/, 'beauty-services'], [/./, 'cleaning']],
  food: [[/restaurant|cafe|diner|eatery|fast.?food/, 'restaurants'], [/cater/, 'catering'], [/grocer|supermarket|market|provision/, 'groceries'], [/bakery|bread|cake|pastry/, 'bakery'], [/drink|beverage|juice|coffee|tea|soda/, 'beverages'], [/./, 'groceries']],
  agriculture: [[/seed/, 'seeds'], [/fertiliz|manure/, 'fertilizers'], [/tractor|plough|harvester|equipment|machine/, 'farm-equipment'], [/feed|fodder/, 'livestock-feed'], [/./, 'crops']],
  'animals-pets': [[/\bcat\b|kitten/, 'cats'], [/bird|parrot|poultry|chicken/, 'birds'], [/goat|cattle|\bcow\b|sheep|livestock/, 'livestock'], [/pet food|dog food|cat food/, 'pet-food'], [/leash|cage|kennel|collar|accessor/, 'pet-accessories'], [/./, 'dogs']],
  'baby-kids': [[/cloth|wear|onesie|romper/, 'baby-clothing'], [/\btoy|lego|doll|puzzle/, 'toys'], [/stroller|pram|pushchair|car seat/, 'strollers'], [/school|\bbook|crayon|supply/, 'school-supplies'], [/baby food|formula|cereal/, 'baby-food'], [/./, 'toys']],
  'sports-fitness': [[/gym|weight|dumbbell|treadmill|fitness/, 'gym-equipment'], [/cycl|bicycle/, 'cycling'], [/outdoor|camp|hik|tent/, 'outdoor'], [/football|basketball|soccer|team|jersey/, 'team-sports'], [/apparel|wear|kit/, 'sports-apparel'], [/./, 'gym-equipment']],
  'business-industrial': [[/office/, 'office-equipment'], [/wholesale|bulk|distributor/, 'wholesale'], [/\btool/, 'industrial-tools'], [/./, 'machinery']],
  'events-tickets': [[/concert|gig|live music/, 'concerts'], [/sport|match|game/, 'sports-events'], [/theat|drama|play\b/, 'theater'], [/conference|summit|seminar|expo/, 'conferences'], [/./, 'festivals']],
  education: [[/\bbook|textbook|novel/, 'books'], [/course|class|program|degree|diploma/, 'courses'], [/tutor|lesson/, 'tutoring-edu'], [/stationery|\bpen\b|notebook|pencil/, 'stationery'], [/./, 'courses']],
  travel: [[/flight|airline|airfare/, 'flights'], [/hotel|guesthouse|lodge|resort|hostel/, 'hotels'], [/tour|safari|excursion|attraction|museum/, 'tours'], [/luggage|suitcase/, 'luggage'], [/./, 'hotels']],
  construction: [[/cement|mixer|concrete/, 'cement-mixers'], [/generator/, 'generators'], [/excavat|bulldozer|loader/, 'excavators'], [/drill/, 'drilling-machines'], [/\btool|grinder|saw|hammer/, 'power-tools'], [/./, 'building-materials']],
  'repair-services': [[/car|auto|mechanic|vehicle/, 'car-repair'], [/phone|mobile/, 'phone-repair'], [/appliance|fridge|washing|air condition/, 'appliance-repair'], [/plumb/, 'plumbing-repair'], [/electric/, 'electrical-repair'], [/./, 'appliance-repair']],
  rentals: [[/car|vehicle/, 'car-rentals'], [/equipment|\btool|machine/, 'equipment-rentals'], [/event|party|tent/, 'event-rentals'], [/./, 'property-rentals']],
  entertainment: [[/music|album|song|vinyl/, 'music'], [/movie|film|\bdvd\b|cinema/, 'movies'], [/\bgame|gaming/, 'games'], [/instrument|guitar|piano|drum/, 'instruments'], [/./, 'art-collectibles']],
  community: [[/lost|found/, 'lost-found'], [/\bfree\b|giveaway|donat/, 'free-items'], [/volunteer/, 'volunteers'], [/./, 'announcements']],
};

/** Assign a canonical subcategory for a categoryId from title/description text. */
function classifySubcategory(categoryId, title = '', description = '', source = '') {
  const rules = SUB_RULES[categoryId];
  if (!rules) return null;
  if (categoryId === 'rentals' && /airbnb/.test(source || '')) return 'property-rentals';
  if (categoryId === 'animals-pets' && (source || '').startsWith('dog')) return 'dogs';
  const t = `${title} ${description}`.toLowerCase();
  for (const [re, sub] of rules) if (re.test(t)) return sub;
  return null;
}

module.exports = { CATEGORIES, CATEGORY_IDS, SUB_IDS, VALID_SUBS, resolveCategory, categorize, classifySubcategory };
