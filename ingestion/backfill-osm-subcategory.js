'use strict';
/* Phase 1: spread existing OSM listings into precise subcategories using the OSM
   shop/amenity type already embedded in each listing's description
   ("<Kind> in <city>, <country>. Listing sourced from OpenStreetMap"). No
   re-crawl — pure back-office update. Only changes subcategory, never category,
   and only to a sub that is valid for the listing's category. */
const admin = require('firebase-admin');
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const TAX = {
  vehicles: ['cars','motorcycles','trucks','buses','bicycles','boats','spare-parts'],
  'real-estate': ['houses-sale','houses-rent','apartments','land','commercial-property','short-let'],
  electronics: ['tvs','audio-speakers','cameras','gaming-consoles','smart-devices','wearables','accessories'],
  'phones-tablets': ['smartphones','feature-phones','tablets','phone-accessories','sim-cards'],
  computers: ['laptops','desktops','components','printers','networking','software'],
  fashion: ['mens-clothing','womens-clothing','shoes','bags','accessories','watches-jewelry','traditional-wear'],
  beauty: ['skincare','makeup','haircare','fragrances','beauty-tools'],
  'home-furniture': ['sofas-chairs','beds-mattresses','tables-desks','wardrobes','kitchen','decor','home-appliances','office-furniture'],
  jobs: ['full-time','part-time','freelance','internships','remote'],
  services: ['cleaning','electrical','plumbing','graphic-design','tutoring','photography','beauty-services'],
  food: ['restaurants','catering','groceries','bakery','beverages'],
  agriculture: ['crops','seeds','fertilizers','farm-equipment','livestock-feed'],
  'animals-pets': ['dogs','cats','birds','livestock','pet-accessories','pet-food'],
  'baby-kids': ['baby-clothing','toys','strollers','school-supplies','baby-food'],
  'sports-fitness': ['gym-equipment','cycling','outdoor','team-sports','sports-apparel'],
  'business-industrial': ['office-equipment','machinery','wholesale','industrial-tools'],
  'events-tickets': ['concerts','sports-events','theater','festivals','conferences'],
  education: ['books','courses','tutoring-edu','stationery'],
  travel: ['flights','hotels','tours','luggage','travel-gear'],
  construction: ['building-materials','cement-mixers','generators','excavators','power-tools','drilling-machines'],
  'repair-services': ['car-repair','phone-repair','appliance-repair','plumbing-repair','electrical-repair'],
  rentals: ['equipment-rentals','car-rentals','property-rentals','event-rentals'],
  entertainment: ['music','movies','games','instruments','art-collectibles'],
  community: ['lost-found','free-items','volunteers','announcements'],
};
const VALID = {}; for (const [c, s] of Object.entries(TAX)) VALID[c] = new Set(s);

// OSM "kind" (titleized shop/amenity/tourism value, lowercased here) -> subcategory.
const KIND_SUB = {
  // electronics
  'hifi': 'audio-speakers', 'radiotechnics': 'audio-speakers', 'camera': 'cameras', 'photo': 'cameras',
  'video games': 'gaming-consoles', 'video': 'tvs', 'electronics': 'accessories', 'appliance': 'home-appliances',
  // phones / computers
  'mobile phone': 'smartphones', 'telephone': 'smartphones', 'computer': 'laptops', 'it': 'laptops',
  // home & furniture
  'furniture': 'sofas-chairs', 'bed': 'beds-mattresses', 'kitchen': 'kitchen', 'interior decoration': 'decor',
  'houseware': 'decor', 'curtain': 'decor', 'electrical': 'home-appliances',
  // fashion
  'clothes': 'womens-clothing', 'boutique': 'womens-clothing', 'fashion': 'womens-clothing', 'fashion accessories': 'accessories',
  'shoes': 'shoes', 'bag': 'bags', 'jewelry': 'watches-jewelry', 'watches': 'watches-jewelry', 'tailor': 'traditional-wear', 'fabric': 'traditional-wear',
  // beauty
  'beauty': 'beauty-tools', 'cosmetics': 'makeup', 'perfumery': 'fragrances', 'hairdresser': 'haircare', 'chemist': 'skincare',
  // vehicles
  'car': 'cars', 'car parts': 'spare-parts', 'car repair': 'cars', 'motorcycle': 'motorcycles', 'tyres': 'spare-parts',
  'bicycle': 'bicycles', 'truck': 'trucks', 'boat': 'boats', 'car parts and accessories': 'spare-parts',
  // repair-services
  'car repair ': 'car-repair', 'mobile phone repair': 'phone-repair', 'electronics repair': 'electrical-repair', 'appliance repair': 'appliance-repair',
  // food
  'restaurant': 'restaurants', 'cafe': 'restaurants', 'fast food': 'restaurants', 'food court': 'restaurants', 'marketplace': 'groceries',
  'supermarket': 'groceries', 'convenience': 'groceries', 'greengrocer': 'groceries', 'deli': 'groceries', 'butcher': 'groceries',
  'bakery': 'bakery', 'beverages': 'beverages', 'coffee': 'beverages', 'tea': 'beverages',
  // agriculture
  'florist': 'crops', 'farm': 'crops', 'garden centre': 'farm-equipment', 'agrarian': 'farm-equipment',
  // pets
  'pet': 'pet-accessories', 'veterinary': 'pet-accessories',
  // baby & kids
  'toys': 'toys', 'baby goods': 'baby-clothing', 'kindergarten': 'school-supplies',
  // sports
  'sports': 'gym-equipment', 'outdoor': 'outdoor', 'fitness centre': 'gym-equipment', 'sports centre': 'gym-equipment',
  'stadium': 'team-sports', 'sports hall': 'team-sports', 'pitch': 'team-sports',
  // construction
  'hardware': 'building-materials', 'doityourself': 'power-tools', 'trade': 'building-materials', 'building materials': 'building-materials',
  // business-industrial
  'wholesale': 'wholesale', 'general': 'office-equipment', 'variety store': 'office-equipment',
  // entertainment
  'cinema': 'movies', 'theatre': 'art-collectibles', 'nightclub': 'music', 'arts centre': 'art-collectibles', 'musical instrument': 'instruments',
  // community
  'community centre': 'announcements', 'place of worship': 'announcements', 'library': 'announcements', 'social facility': 'volunteers', 'townhall': 'announcements',
  // education
  'school': 'courses', 'college': 'courses', 'university': 'courses',
  // travel
  'hotel': 'hotels', 'guest house': 'hotels', 'hostel': 'hotels', 'attraction': 'tours', 'museum': 'tours',
};

function kindOf(desc) {
  // description starts with "<Kind> in <city>, ..." — take the part before " in "
  const m = String(desc || '').match(/^(.*?)\s+in\s+/);
  return m ? m[1].trim().toLowerCase() : '';
}

(async () => {
  const snap = await db.collection('listings').get();
  let batch = db.batch(), n = 0, updated = 0, unchanged = 0, noMap = 0;
  const subTally = {};
  for (const d of snap.docs) {
    const x = d.data();
    if (!(x.source || '').startsWith('osm-')) continue;
    const cat = x.categoryId;
    if (!VALID[cat]) continue;
    const kind = kindOf(x.description);
    const sub = KIND_SUB[kind];
    if (!sub || !VALID[cat].has(sub)) { noMap++; continue; }       // no precise mapping -> leave as is
    if (x.subcategory === sub) { unchanged++; continue; }
    batch.update(d.ref, { subcategory: sub });
    subTally[cat + '/' + sub] = (subTally[cat + '/' + sub] || 0) + 1;
    n++; updated++;
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write('.'); }
  }
  if (n > 0) await batch.commit();
  console.log(`\nOSM precise subcategory backfill: updated ${updated} | already-correct ${unchanged} | no-precise-map ${noMap}`);
  console.log('newly distributed:', Object.entries(subTally).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(', '));
  process.exit(0);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
