'use strict';
/* Production data coverage audit: per-category + per-subcategory counts, data
   quality, duplicates, expired/invalid. Read-only. */
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
  other: [],
};
const HEALTHY = 20; // per-category threshold

(async () => {
  const snap = await db.collection('listings').get();
  const cat = {}, sub = {}, seen = {}, dupKeys = {};
  let total = 0, withImg = 0, withPrice = 0, withLoc = 0, withDesc = 0, withSeller = 0, withSub = 0, expired = 0, active = 0;
  const now = Date.now();
  snap.forEach((d) => {
    const x = d.data(); total++;
    const c = (x.categoryId || x.category || 'other').toLowerCase();
    cat[c] = cat[c] || { n: 0, img: 0, price: 0, loc: 0, desc: 0, seller: 0 };
    cat[c].n++;
    const img = !!(x.coverImage || (x.images && x.images.length) || x.hasImage);
    const price = x.amount != null || ['negotiable','free','none','contact','fixed'].includes(x.priceType);
    const loc = !!(x.location || x.country);
    const desc = !!(x.description && String(x.description).trim().length > 10);
    const seller = !!(x.ownerUserId || x.userId);
    if (img) { withImg++; cat[c].img++; }
    if (price) { withPrice++; cat[c].price++; }
    if (loc) { withLoc++; cat[c].loc++; }
    if (desc) { withDesc++; cat[c].desc++; }
    if (seller) { withSeller++; cat[c].seller++; }
    if (x.subcategory) { withSub++; const sk = c + '/' + x.subcategory; sub[sk] = (sub[sk] || 0) + 1; }
    const st = x.status || 'active';
    if (st === 'expired' || st === 'sold' || st === 'inactive') expired++; else active++;
    // duplicate detection by sourceKey / externalId, then title+location
    const key = x.sourceKey || x.externalId || ((x.title || '') + '|' + (x.location || '')).toLowerCase();
    if (key && key !== '|') { if (seen[key]) dupKeys[key] = (dupKeys[key] || 1) + 1; else seen[key] = 1; }
  });

  console.log('================ SABALIST DATA COVERAGE AUDIT ================');
  console.log('TOTAL listings:', total, '| active:', active, '| expired/sold/inactive:', expired);
  console.log('with image:', withImg, '('+Math.round(withImg/total*100)+'%) | with price:', withPrice, '| with location:', withLoc, '| with description:', withDesc, '| with seller:', withSeller);
  console.log('with subcategory set:', withSub, '('+Math.round(withSub/total*100)+'%)');

  console.log('\n--- PER CATEGORY (n | img | price | loc | desc | seller) ---');
  const allCats = [...new Set([...Object.keys(TAX), ...Object.keys(cat)])];
  const belowHealthy = [];
  for (const c of Object.keys(TAX)) {
    const v = cat[c] || { n: 0, img: 0, price: 0, loc: 0, desc: 0, seller: 0 };
    const flag = v.n === 0 ? ' <<< EMPTY' : (v.n < HEALTHY ? ' <<< below ' + HEALTHY : '');
    if (v.n < HEALTHY) belowHealthy.push(c + '(' + v.n + ')');
    console.log(String(v.n).padStart(5), c.padEnd(20), '| img', String(v.img).padStart(5), '| $', String(v.price).padStart(5), '| loc', String(v.loc).padStart(5), '| desc', String(v.desc).padStart(5), '| seller', String(v.seller).padStart(5), flag);
  }
  const unknownCats = Object.keys(cat).filter((c) => !TAX[c]);
  if (unknownCats.length) console.log('UNKNOWN categoryIds present in data:', unknownCats.map((c) => c + '(' + cat[c].n + ')').join(', '));

  console.log('\n--- SUBCATEGORY COVERAGE (filled / total per category; EMPTY subs listed) ---');
  let subTotal = 0, subFilled = 0;
  for (const [c, subs] of Object.entries(TAX)) {
    if (!subs.length) continue;
    const filled = subs.filter((s) => sub[c + '/' + s]);
    const empty = subs.filter((s) => !sub[c + '/' + s]);
    subTotal += subs.length; subFilled += filled.length;
    console.log(c.padEnd(20), filled.length + '/' + subs.length + ' filled' + (empty.length ? '  EMPTY: ' + empty.join(', ') : '  ✓ all filled'));
  }
  console.log('SUBCATEGORY TOTALS: ' + subFilled + '/' + subTotal + ' subcategories have >=1 listing');

  const dups = Object.values(dupKeys).reduce((a, b) => a + (b - 1), 0);
  console.log('\n--- INTEGRITY ---');
  console.log('duplicate listings (same sourceKey/externalId or title+location):', dups, '(across', Object.keys(dupKeys).length, 'keys)');
  console.log('categories below healthy threshold (' + HEALTHY + '):', belowHealthy.length ? belowHealthy.join(', ') : 'NONE');
  process.exit(0);
})().catch((e) => { console.error('audit failed:', e.message); process.exit(1); });
