'use strict';
/* Seed realistic listings into still-empty subcategories so every sub looks
   active. Tagged source/ownerUserId 'seed-catalog' (identifiable + removable;
   ranked as import, not organic). Reuses real category-appropriate cover images
   sampled from existing listings. Run after backfill-subcategories.js. */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const CITIES = [['Lagos','Nigeria'],['Nairobi','Kenya'],['Accra','Ghana'],['Addis Ababa','Ethiopia'],['Johannesburg','South Africa'],['Cairo','Egypt'],['Kampala','Uganda'],['Dar es Salaam','Tanzania'],['Kigali','Rwanda'],['Abuja','Nigeria'],['Mombasa','Kenya'],['Kumasi','Ghana']];

// Per-subcategory realistic item pools + a [min,max] price band (USD). cat:sub => {items, price}
const SEED = {
  'vehicles:buses': { p:[6000,45000], items:['Toyota Coaster 30-seater','Mercedes Sprinter minibus','Nissan Civilian bus','Toyota Hiace 18-seater','Marcopolo coach bus','Higer city bus','Ford Transit minibus'] },
  'vehicles:bicycles': { p:[60,600], items:['Mountain bike 26"','Trek road bicycle','BMX stunt bike','Foldable city bike','Kids bicycle with training wheels','Hybrid commuter bike','Electric assist bicycle'] },
  'vehicles:boats': { p:[1500,40000], items:['Fiberglass fishing boat','Yamaha speedboat','Inflatable dinghy with motor','Wooden canoe','Pontoon boat 8-seater','Jet ski Sea-Doo','Cabin cruiser boat'] },
  'real-estate:houses-sale': { p:[35000,400000], items:['3-bedroom bungalow for sale','4-bedroom duplex with BQ','2-bedroom semi-detached house','5-bedroom mansion with pool','Newly built terrace house','Family home on half-plot','Detached villa for sale'] },
  'real-estate:land': { p:[5000,150000], items:['600sqm residential plot','1 acre farmland','Commercial plot on main road','Half-plot in gated estate','2 plots of land with C of O','Beachfront land parcel','Corner plot, fenced'] },
  'real-estate:short-let': { p:[25,180], items:['Cozy studio short-let (nightly)','1-bed serviced apartment short stay','Furnished short-let near city centre','Executive short-let with WiFi','2-bed short-let apartment','Short stay near airport','Self-contained short-let'] },
  'electronics:audio-speakers': { p:[20,500], items:['JBL Bluetooth speaker','Sony soundbar 2.1','Bose home speaker','Marshall portable speaker','5.1 surround sound system','DJ PA speaker pair','Wireless earbuds + speaker combo'] },
  'electronics:gaming-consoles': { p:[120,650], items:['PlayStation 5 console','Xbox Series X','Nintendo Switch OLED','PlayStation 4 Pro 1TB','Xbox One S bundle','Retro games console','Steam Deck handheld'] },
  'electronics:wearables': { p:[25,400], items:['Apple Watch SE','Samsung Galaxy Watch','Fitbit Charge fitness band','Xiaomi Mi Band','Garmin GPS smartwatch','Smart ring tracker','Kids GPS watch'] },
  'phones-tablets:feature-phones': { p:[15,60], items:['Nokia 105 dual-SIM','Itel keypad phone','Tecno T-series feature phone','Nokia 3310 reissue','Bontel big-battery phone','Senior-friendly button phone'] },
  'phones-tablets:sim-cards': { p:[1,10], items:['MTN SIM card with bundle','Airtel data SIM','Safaricom SIM starter','Glo SIM + 5GB','Vodacom prepaid SIM','eSIM activation voucher'] },
  'computers:desktops': { p:[150,1200], items:['HP EliteDesk tower','Dell OptiPlex desktop','iMac 24" all-in-one','Custom gaming PC RTX','Lenovo ThinkCentre','Refurbished office desktop','HP Pavilion desktop bundle'] },
  'computers:components': { p:[20,600], items:['16GB DDR4 RAM kit','500GB SSD drive','RTX 3060 graphics card','Ryzen 5 CPU','ATX motherboard','650W power supply','CPU cooler fan'] },
  'computers:printers': { p:[40,400], items:['HP DeskJet all-in-one printer','Canon PIXMA printer','Epson EcoTank printer','Brother laser printer','HP LaserJet Pro','Portable photo printer'] },
  'computers:software': { p:[5,200], items:['Windows 11 Pro license','Microsoft Office 365 key','Antivirus 1-year license','Adobe Creative Cloud plan','AutoCAD license','POS software license'] },
  'fashion:traditional-wear': { p:[15,200], items:['Ankara two-piece set','Kente cloth wrapper','Agbada three-piece','Dashiki shirt','Kaftan embroidered gown','Aso-oke gele set','Senator native wear'] },
  'home-furniture:wardrobes': { p:[80,700], items:['4-door wooden wardrobe','Sliding mirror wardrobe','2-door kids wardrobe','Walk-in closet unit','Fitted bedroom wardrobe','Portable cloth wardrobe'] },
  'home-furniture:home-appliances': { p:[60,900], items:['Double-door refrigerator','7kg washing machine','Microwave oven 20L','Standing fan','Air conditioner 1.5HP','Electric cooker with oven','Chest freezer 200L'] },
  'food:catering': { p:[100,2000], items:['Event catering service (per 50 guests)','Small chops platter package','Jollof rice party tray','Wedding catering package','Office lunch catering','Outdoor BBQ catering','Buffet setup + service'] },
  'agriculture:fertilizers': { p:[15,120], items:['NPK 15-15-15 fertilizer 50kg','Urea fertilizer bag','Organic compost manure','Foliar liquid fertilizer','DAP fertilizer 50kg','Poultry manure (bulk)'] },
  'agriculture:farm-equipment': { p:[80,8000], items:['Knapsack sprayer 16L','Walking tractor / power tiller','Maize sheller machine','Water pump for irrigation','Manual planter','Diesel grain mill','Tractor-mounted plough'] },
  'agriculture:livestock-feed': { p:[10,90], items:['Layers mash 25kg','Broiler starter feed','Fish feed floating pellets','Cattle concentrate feed','Goat mineral lick','Pig grower feed'] },
  'animals-pets:cats': { p:[20,400], items:['Persian kitten','British Shorthair cat','Domestic tabby kitten','Siamese cat','Maine Coon kitten','Rescue cat for adoption'] },
  'animals-pets:birds': { p:[5,300], items:['African grey parrot','Lovebirds pair','Canary songbird','Cockatiel','Layer chickens (point of lay)','Pigeons pair','Budgerigar'] },
  'animals-pets:livestock': { p:[50,1500], items:['Healthy goat (Boer)','Ram for sale','Dairy cow','Pig (weaner)','Sheep','Rabbit colony','Broiler chickens (50)'] },
  'animals-pets:pet-accessories': { p:[5,120], items:['Dog leash + collar set','Cat litter box','Pet carrier crate','Aquarium 60L with filter','Bird cage large','Dog kennel house','Pet grooming kit'] },
  'animals-pets:pet-food': { p:[8,90], items:['Dog dry food 10kg','Cat food premium 4kg','Puppy starter food','Fish flakes tin','Bird seed mix 5kg','Grain-free dog food'] },
  'baby-kids:baby-clothing': { p:[5,60], items:['Newborn onesie 5-pack','Baby romper set','Toddler dress','Kids hoodie + joggers','Baby shoes soft sole','Christening outfit','Winter baby jumpsuit'] },
  'baby-kids:strollers': { p:[40,400], items:['Foldable baby stroller','Twin tandem pram','3-in-1 travel system','Lightweight umbrella stroller','Jogging stroller','Convertible car seat + stroller'] },
  'baby-kids:baby-food': { p:[3,40], items:['Infant formula tin','Baby cereal multigrain','Pureed fruit pouches (pack)','Toddler snack puffs','Organic baby porridge','Follow-on milk 900g'] },
  'sports-fitness:cycling': { p:[60,900], items:['Road racing bicycle','Mountain bike full-suspension','Indoor spin bike','Cycling helmet + gloves set','Bike repair tool kit','Kids cycling bike'] },
  'sports-fitness:sports-apparel': { p:[10,120], items:['Football jersey (team kit)','Running shoes','Compression gym wear','Tracksuit set','Sports bra + leggings','Boxing gloves','Yoga mat + wear set'] },
  'business-industrial:office-equipment': { p:[40,1500], items:['Photocopier machine','Office shredder','Conference projector','Reception desk + chairs','Filing cabinet 4-drawer','POS terminal','Heavy-duty laminator'] },
  'events-tickets:concerts': { p:[10,150], items:['Afrobeats live concert ticket','Gospel night concert pass','Jazz festival ticket','New Year countdown concert','Album launch concert','VIP concert table (4)'] },
  'events-tickets:sports-events': { p:[8,120], items:['Premier league viewing ticket','Local derby match ticket','Boxing night ticket','Marathon race entry','Basketball finals seat','Wrestling event pass'] },
  'events-tickets:theater': { p:[10,90], items:['Stage play ticket','Comedy night ticket','Cultural dance show','Drama festival pass','Musical theatre seat','Spoken word night'] },
  'events-tickets:conferences': { p:[20,400], items:['Tech summit pass','Business conference ticket','Startup expo entry','Marketing masterclass seat','Health symposium pass','Agritech conference ticket'] },
  'education:books': { p:[3,80], items:['JAMB/WAEC past questions set','Secondary school textbooks (bundle)','Bestseller novel','Children\'s story book set','University course textbook','Quran/Bible study set','Coding for beginners book'] },
  'education:tutoring-edu': { p:[10,200], items:['Maths home tutor (monthly)','IELTS prep classes','Coding bootcamp for kids','JAMB intensive lessons','French language tutor','Music lessons (piano)'] },
  'education:stationery': { p:[1,40], items:['Exercise books (pack of 10)','Student backpack','Geometry set','Whiteboard + markers','Office stationery bundle','Coloured pens & pencils set'] },
  'travel:flights': { p:[80,900], items:['Domestic flight ticket (Lagos-Abuja)','Regional flight Nairobi-Mombasa','Discounted intl flight deal','Round-trip Accra-Kumasi','Charter flight seat','Group travel flight package'] },
  'travel:travel-gear': { p:[8,150], items:['Travel neck pillow set','Universal power adapter','Packing cubes set','Hard-shell carry-on','Travel toiletry kit','Portable luggage scale'] },
  'construction:cement-mixers': { p:[300,3000], items:['Portable concrete mixer','Diesel cement mixer 400L','Electric mortar mixer','Self-loading mixer','Drum cement mixer','Twin-shaft mixer'] },
  'construction:generators': { p:[120,4000], items:['2.5KVA petrol generator','Diesel generator 10KVA','Inverter generator silent','Tiger 1KVA generator','Perkins 30KVA genset','Solar generator backup'] },
  'construction:excavators': { p:[8000,90000], items:['Mini excavator 1.5T','CAT 320 excavator','Komatsu backhoe loader','Wheeled excavator','JCB digger','Used excavator (good condition)'] },
  'construction:power-tools': { p:[20,400], items:['Cordless drill set','Angle grinder','Circular saw','Impact wrench','Rotary hammer drill','Welding machine inverter'] },
  'construction:drilling-machines': { p:[40,600], items:['Pillar drilling machine','Magnetic core drill','Bench drill press','Hammer drill heavy-duty','Borehole drilling rig (compact)','Pneumatic drill'] },
  'repair-services:phone-repair': { p:[5,120], items:['Phone screen replacement','iPhone battery swap','Water-damage phone repair','Charging port fix','Software unlock service','Tablet screen repair'] },
  'repair-services:plumbing-repair': { p:[10,200], items:['Leaking pipe repair','Toilet/cistern fix','Water heater installation','Drain unblocking service','Tap & sink replacement','Borehole pump repair'] },
  'rentals:equipment-rentals': { p:[15,300], items:['Generator for rent (daily)','Scaffolding hire','Power tools rental','Sound system + DJ hire','Pressure washer rental','Concrete mixer hire'] },
  'rentals:car-rentals': { p:[25,200], items:['Toyota Corolla car hire (daily)','SUV rental with driver','Coaster bus hire for events','Luxury car rental (wedding)','Pickup truck hire','Self-drive car rental'] },
  'rentals:event-rentals': { p:[20,500], items:['Canopy + chairs rental','Event tent hire','Wedding decor rental package','Cooling fan/AC hire','Stage & lighting rental','Cutlery & plates hire'] },
  'entertainment:music': { p:[2,60], items:['Vinyl records (Afrobeat)','Studio recording session','Music album CD bundle','Karaoke machine','DJ mix USB pack','Instrument tuning service'] },
  'entertainment:games': { p:[5,80], items:['FIFA 24 game disc','Board games bundle','PS5 game (Spider-Man)','Chess set premium','Card games pack','Puzzle 1000pc'] },
  'entertainment:instruments': { p:[20,1200], items:['Acoustic guitar','Yamaha keyboard 61-key','Djembe drum','Violin student set','Saxophone (alto)','Conga drums pair','Electric guitar + amp'] },
  'community:free-items': { p:null, items:['Free moving boxes (pickup)','Giving away baby clothes','Free firewood','Free sofa - you collect','Free garden soil','Free school books','Free pet to good home'] },
  'community:volunteers': { p:null, items:['Volunteers needed - beach cleanup','Community teaching volunteers','Hospital visit volunteers','Tree planting drive','Food bank helpers needed','Mentors wanted for youth'] },
};

const rnd = (i, n) => i % n;
function price(band, i) {
  if (!band) return { amount: null, priceType: 'free' };
  const span = band[1] - band[0];
  const amount = Math.round((band[0] + (span * ((i * 37) % 100) / 100)) / 5) * 5;
  return { amount, priceType: 'fixed' };
}

(async () => {
  // 1) Re-derive currently-empty subs from live data.
  const snap = await db.collection('listings').get();
  const filledSubs = new Set(); const imgByCat = {}; const allImgs = [];
  snap.forEach((d) => {
    const x = d.data(); const c = (x.categoryId || '').toLowerCase();
    if (x.subcategory) filledSubs.add(c + ':' + x.subcategory);
    const img = x.coverImage || (x.images && x.images[0]);
    if (img && /^https?:\/\//.test(img)) { (imgByCat[c] = imgByCat[c] || []).push(img); allImgs.push(img); }
  });

  const PER = 12; const now = new Date().toISOString();
  let batch = db.batch(), n = 0, created = 0, subsSeeded = 0;
  for (const [key, def] of Object.entries(SEED)) {
    if (filledSubs.has(key)) continue; // already has real data — skip
    const [cat, sub] = key.split(':');
    const imgs = (imgByCat[cat] && imgByCat[cat].length) ? imgByCat[cat] : allImgs;
    subsSeeded++;
    for (let i = 0; i < PER; i++) {
      const item = def.items[i % def.items.length];
      const [city, country] = CITIES[(i + created) % CITIES.length];
      const variant = i >= def.items.length ? ` (${['clean','negotiable','sharp','quality','standard'][i % 5]})` : '';
      const pr = price(def.p, i);
      const img = imgs.length ? imgs[(i * 7 + created) % imgs.length] : null;
      const ref = db.collection('listings').doc();
      batch.set(ref, {
        title: `${item}${variant}`.slice(0, 120),
        description: `${item} available in ${city}, ${country}. Contact the seller for details, condition and delivery. Listed on Sabalist.`,
        categoryId: cat, category: cat, subcategory: sub,
        amount: pr.amount, priceType: pr.priceType, currency: 'USD',
        location: `${city}, ${country}`, country,
        images: img ? [img] : [], coverImage: img || null, hasImage: !!img,
        source: 'seed-catalog', ownerUserId: 'seed-catalog', status: 'active',
        createdAt: now, updatedAt: now,
      });
      n++; created++;
      if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write('.'); }
    }
  }
  if (n > 0) await batch.commit();
  console.log(`\nseeded ${created} listings across ${subsSeeded} empty subcategories (12 each, tagged source=seed-catalog).`);
  process.exit(0);
})().catch((e) => { console.error('seed failed:', e.message); process.exit(1); });
