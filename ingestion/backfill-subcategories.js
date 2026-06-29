'use strict';
/* Classify existing listings into canonical subcategories by keyword/source.
   Only writes when a listing has no subcategory OR an invalid one (not in its
   category's canonical sub list). Real data → correct sub. Batched writes. */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
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

// match(rules, text, fallback): first rule whose regex hits wins.
function pick(rules, t, fallback) { for (const [re, sub] of rules) if (re.test(t)) return sub; return fallback; }

function classify(cat, t, src) {
  switch (cat) {
    case 'vehicles': return pick([[/motorcycle|scooter|\bbike\b|moped/, 'motorcycles'], [/truck|lorry|trailer|pickup/, 'trucks'], [/\bbus\b|coaster|minibus/, 'buses'], [/bicycle|cycling/, 'bicycles'], [/boat|yacht|canoe|jetski/, 'boats'], [/spare|tyre|tire|\bpart|engine|battery|rim/, 'spare-parts']], t, 'cars');
    case 'real-estate': return pick([[/\bland\b|plot|acre/, 'land'], [/office|shop|commercial|warehouse|store space/, 'commercial-property'], [/short.?let|short stay|nightly/, 'short-let'], [/for sale|house for sale|\bsale\b/, 'houses-sale'], [/apartment|flat|condo|studio/, 'apartments']], t, 'houses-rent');
    case 'electronics': return pick([[/\btv\b|television|smart tv/, 'tvs'], [/speaker|audio|headphone|earbud|soundbar/, 'audio-speakers'], [/camera|dslr|gopro|lens/, 'cameras'], [/playstation|\bps5\b|\bps4\b|xbox|nintendo|console/, 'gaming-consoles'], [/smart (home|device)|alexa|echo|iot/, 'smart-devices'], [/watch|wearable|fitbit|band/, 'wearables']], t, 'accessories');
    case 'phones-tablets': return pick([[/tablet|ipad|tab\b/, 'tablets'], [/feature phone|keypad|nokia 11/, 'feature-phones'], [/\bsim\b|sim card/, 'sim-cards'], [/case|charger|cable|screen protector|cover|accessor/, 'phone-accessories']], t, 'smartphones');
    case 'computers': return pick([[/laptop|macbook|notebook|chromebook/, 'laptops'], [/desktop|tower|imac|all.in.one/, 'desktops'], [/\bram\b|\bcpu\b|\bgpu\b|motherboard|component|ssd|hard drive/, 'components'], [/printer|scanner|toner/, 'printers'], [/router|network|switch|modem/, 'networking'], [/software|license|windows|office 365|antivirus/, 'software']], t, 'laptops');
    case 'fashion': return pick([[/shoe|sneaker|boot|heel|sandal/, 'shoes'], [/\bbag\b|handbag|backpack|purse|wallet/, 'bags'], [/watch|jewel|ring|necklace|bracelet|earring/, 'watches-jewelry'], [/traditional|ankara|kente|dashiki|kaftan|abaya/, 'traditional-wear'], [/women|woman|ladies|dress|skirt|blouse/, 'womens-clothing'], [/\bmen\b|\bman\b|shirt|trouser|suit/, 'mens-clothing']], t, 'accessories');
    case 'beauty': return pick([[/skin|lotion|cream|serum|moistur/, 'skincare'], [/makeup|lipstick|foundation|mascara|eyeshadow/, 'makeup'], [/hair|shampoo|wig|conditioner|braid/, 'haircare'], [/perfume|fragrance|cologne|scent/, 'fragrances']], t, 'beauty-tools');
    case 'home-furniture': return pick([[/sofa|couch|chair|recliner/, 'sofas-chairs'], [/\bbed\b|mattress|bunk/, 'beds-mattresses'], [/table|desk/, 'tables-desks'], [/wardrobe|closet|dresser/, 'wardrobes'], [/kitchen|cookware|\bwok\b|pot|pan|utensil/, 'kitchen'], [/fridge|refrigerator|washing machine|microwave|appliance|blender|oven/, 'home-appliances'], [/office (chair|desk|furniture)/, 'office-furniture'], [/decor|lamp|\brug\b|curtain|mirror|vase/, 'decor']], t, 'decor');
    case 'jobs': return pick([[/part.?time/, 'part-time'], [/freelance|contract|gig/, 'freelance'], [/intern/, 'internships'], [/remote|work from home|wfh/, 'remote']], t, 'full-time');
    case 'services': return pick([[/clean/, 'cleaning'], [/electric/, 'electrical'], [/plumb/, 'plumbing'], [/design|graphic|logo|branding/, 'graphic-design'], [/tutor|lesson|teach|coaching/, 'tutoring'], [/photo|video|film/, 'photography'], [/salon|spa|barber|\bhair\b|\bnail\b|beauty/, 'beauty-services']], t, 'cleaning');
    case 'food': return pick([[/restaurant|cafe|diner|eatery|bistro|fast.?food/, 'restaurants'], [/cater/, 'catering'], [/grocer|supermarket|market|provision/, 'groceries'], [/bakery|bread|cake|pastry|confection/, 'bakery'], [/drink|beverage|juice|coffee|tea|water|soda/, 'beverages']], t, 'groceries');
    case 'agriculture': return pick([[/seed/, 'seeds'], [/fertiliz|manure/, 'fertilizers'], [/tractor|plough|harvester|equipment|machine/, 'farm-equipment'], [/feed|fodder/, 'livestock-feed'], [/crop|grain|maize|rice|harvest|produce|vegetable/, 'crops']], t, 'crops');
    case 'animals-pets': return src && src.startsWith('dog') ? 'dogs' : pick([[/\bcat\b|kitten/, 'cats'], [/bird|parrot|poultry|chicken/, 'birds'], [/goat|cattle|\bcow\b|sheep|livestock|cattle/, 'livestock'], [/pet food|dog food|cat food/, 'pet-food'], [/leash|cage|kennel|collar|accessor/, 'pet-accessories'], [/\bdog\b|puppy/, 'dogs']], t, 'dogs');
    case 'baby-kids': return pick([[/cloth|wear|onesie|romper/, 'baby-clothing'], [/\btoy|lego|doll|puzzle/, 'toys'], [/stroller|pram|pushchair|car seat/, 'strollers'], [/school|\bbook|crayon|supply/, 'school-supplies'], [/baby food|formula|cereal/, 'baby-food']], t, 'toys');
    case 'sports-fitness': return pick([[/gym|weight|dumbbell|treadmill|fitness/, 'gym-equipment'], [/cycl|bicycle/, 'cycling'], [/outdoor|camp|hik|tent/, 'outdoor'], [/football|basketball|soccer|team|jersey|volleyball/, 'team-sports'], [/apparel|wear|kit/, 'sports-apparel']], t, 'gym-equipment');
    case 'business-industrial': return pick([[/office/, 'office-equipment'], [/wholesale|bulk|distributor/, 'wholesale'], [/\btool/, 'industrial-tools'], [/machine|equipment|industrial|generator/, 'machinery']], t, 'machinery');
    case 'events-tickets': return pick([[/concert|gig|live music/, 'concerts'], [/sport|match|game/, 'sports-events'], [/theat|drama|play\b/, 'theater'], [/conference|summit|seminar|expo|workshop/, 'conferences'], [/festival|holiday|carnival|celebration/, 'festivals']], t, 'festivals');
    case 'education': return pick([[/\bbook|textbook|novel/, 'books'], [/course|class|program|degree|diploma/, 'courses'], [/tutor|lesson/, 'tutoring-edu'], [/stationery|\bpen\b|notebook|pencil/, 'stationery']], t, 'courses');
    case 'travel': return pick([[/flight|airline|ticket|airfare/, 'flights'], [/hotel|guesthouse|lodge|resort|hostel|inn\b/, 'hotels'], [/tour|safari|excursion|attraction|museum/, 'tours'], [/luggage|suitcase|backpack/, 'luggage'], [/gear|adapter|pillow/, 'travel-gear']], t, 'hotels');
    case 'construction': return pick([[/cement|mixer|concrete/, 'cement-mixers'], [/generator/, 'generators'], [/excavat|bulldozer|loader/, 'excavators'], [/drill/, 'drilling-machines'], [/\btool|grinder|saw|hammer/, 'power-tools'], [/material|brick|sand|block|steel|timber|hardware/, 'building-materials']], t, 'building-materials');
    case 'repair-services': return pick([[/car|auto|mechanic|vehicle/, 'car-repair'], [/phone|mobile/, 'phone-repair'], [/appliance|fridge|washing|ac\b|air condition/, 'appliance-repair'], [/plumb/, 'plumbing-repair'], [/electric/, 'electrical-repair']], t, 'appliance-repair');
    case 'rentals': return src && /airbnb/.test(src) ? 'property-rentals' : pick([[/car|vehicle/, 'car-rentals'], [/equipment|\btool|machine/, 'equipment-rentals'], [/event|party|tent|chair|canopy/, 'event-rentals'], [/property|apartment|house|room|flat|short.?let/, 'property-rentals']], t, 'property-rentals');
    case 'entertainment': return pick([[/music|album|song|vinyl/, 'music'], [/movie|film|\bdvd\b|cinema/, 'movies'], [/\bgame|gaming|console/, 'games'], [/instrument|guitar|piano|drum|keyboard/, 'instruments'], [/\bart\b|painting|sculpture|collect|craft|gallery|theat/, 'art-collectibles']], t, 'art-collectibles');
    case 'community': return pick([[/lost|found/, 'lost-found'], [/\bfree\b|giveaway|donat/, 'free-items'], [/volunteer/, 'volunteers']], t, 'announcements');
    default: return null;
  }
}

(async () => {
  const snap = await db.collection('listings').get();
  let batch = db.batch(), n = 0, updated = 0, skipped = 0, noCat = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const cat = (x.categoryId || x.category || '').toLowerCase();
    if (!VALID[cat]) { noCat++; continue; }
    const curSub = x.subcategory;
    if (curSub && VALID[cat].has(curSub)) { skipped++; continue; } // already valid
    const text = `${x.title || ''} ${x.description || ''}`.toLowerCase();
    const sub = classify(cat, text, x.source);
    if (!sub) { skipped++; continue; }
    batch.update(d.ref, { subcategory: sub });
    n++; updated++;
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write('.'); }
  }
  if (n > 0) await batch.commit();
  console.log(`\nsubcategory backfill: updated ${updated} | already-valid skipped ${skipped} | non-canonical-category ${noCat} | total ${snap.size}`);
  process.exit(0);
})().catch((e) => { console.error('backfill failed:', e.message); process.exit(1); });
