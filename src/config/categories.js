/**
 * Sabalist Category System — Single Source of Truth
 *
 * All category data (display order, icons, subcategories, IDs, i18n keys)
 * lives here. Other config files (categoryMapping, categoryI18n,
 * categoryLimits) derive from this.
 *
 * Schema:
 *   key        — Canonical display name (what we store in Firestore `category`)
 *   id         — Slug used in Firestore `categoryId` and SEO URLs
 *   labelKey   — i18n translation key
 *   icon       — Ionicons name
 *   fallback   — English label, used when i18n key is missing
 *   subCategories[] — { id, labelKey, icon, fallback }
 *
 * To add a new top-level category: append to CATEGORIES.
 * To map a removed legacy category: add an entry to LEGACY_CATEGORY_ALIASES.
 */

export const CATEGORIES = [
  {
    key: 'Vehicles',
    id: 'vehicles',
    labelKey: 'categories.vehicles',
    fallback: 'Vehicles',
    icon: 'car-sport',
    subCategories: [
      { id: 'cars', labelKey: 'subCategories.cars', icon: 'car-sport', fallback: 'Cars' },
      { id: 'motorcycles', labelKey: 'subCategories.motorcycles', icon: 'bicycle', fallback: 'Motorcycles' },
      { id: 'trucks', labelKey: 'subCategories.trucks', icon: 'bus', fallback: 'Trucks' },
      { id: 'buses', labelKey: 'subCategories.buses', icon: 'bus', fallback: 'Buses' },
      { id: 'bicycles', labelKey: 'subCategories.bicycles', icon: 'bicycle', fallback: 'Bicycles' },
      { id: 'boats', labelKey: 'subCategories.boats', icon: 'boat', fallback: 'Boats' },
      { id: 'spare-parts', labelKey: 'subCategories.spareParts', icon: 'build', fallback: 'Spare Parts' },
    ],
  },
  {
    key: 'Real Estate',
    id: 'real-estate',
    labelKey: 'categories.realEstate',
    fallback: 'Property / Real Estate',
    icon: 'home',
    subCategories: [
      { id: 'houses-sale', labelKey: 'subCategories.housesSale', icon: 'home', fallback: 'Houses for Sale' },
      { id: 'houses-rent', labelKey: 'subCategories.housesRent', icon: 'key', fallback: 'Houses for Rent' },
      { id: 'apartments', labelKey: 'subCategories.apartments', icon: 'business', fallback: 'Apartments' },
      { id: 'land', labelKey: 'subCategories.land', icon: 'map', fallback: 'Land' },
      { id: 'commercial-property', labelKey: 'subCategories.commercialProperty', icon: 'storefront', fallback: 'Commercial Property' },
      { id: 'short-let', labelKey: 'subCategories.shortLet', icon: 'bed', fallback: 'Short Let' },
    ],
  },
  {
    key: 'Electronics',
    id: 'electronics',
    labelKey: 'categories.electronics',
    fallback: 'Electronics',
    icon: 'hardware-chip',
    subCategories: [
      { id: 'tvs', labelKey: 'subCategories.tvs', icon: 'tv', fallback: 'TVs' },
      { id: 'audio-speakers', labelKey: 'subCategories.audioSpeakers', icon: 'volume-high', fallback: 'Audio & Speakers' },
      { id: 'cameras', labelKey: 'subCategories.cameras', icon: 'camera', fallback: 'Cameras' },
      { id: 'gaming-consoles', labelKey: 'subCategories.gamingConsoles', icon: 'game-controller', fallback: 'Gaming Consoles' },
      { id: 'smart-devices', labelKey: 'subCategories.smartDevices', icon: 'wifi', fallback: 'Smart Devices' },
      { id: 'wearables', labelKey: 'subCategories.wearables', icon: 'watch', fallback: 'Wearables' },
      { id: 'accessories', labelKey: 'subCategories.accessories', icon: 'headset', fallback: 'Accessories' },
    ],
  },
  {
    key: 'Phones & Tablets',
    id: 'phones-tablets',
    labelKey: 'categories.phonesTablets',
    fallback: 'Phones & Tablets',
    icon: 'phone-portrait',
    subCategories: [
      { id: 'smartphones', labelKey: 'subCategories.smartphones', icon: 'phone-portrait', fallback: 'Smartphones' },
      { id: 'feature-phones', labelKey: 'subCategories.featurePhones', icon: 'call', fallback: 'Feature Phones' },
      { id: 'tablets', labelKey: 'subCategories.tablets', icon: 'tablet-portrait', fallback: 'Tablets' },
      { id: 'phone-accessories', labelKey: 'subCategories.phoneAccessories', icon: 'battery-charging', fallback: 'Phone Accessories' },
      { id: 'sim-cards', labelKey: 'subCategories.simCards', icon: 'card', fallback: 'SIM Cards & Plans' },
    ],
  },
  {
    key: 'Computers',
    id: 'computers',
    labelKey: 'categories.computers',
    fallback: 'Computers',
    icon: 'laptop',
    subCategories: [
      { id: 'laptops', labelKey: 'subCategories.laptops', icon: 'laptop', fallback: 'Laptops' },
      { id: 'desktops', labelKey: 'subCategories.desktops', icon: 'desktop', fallback: 'Desktops' },
      { id: 'components', labelKey: 'subCategories.components', icon: 'hardware-chip', fallback: 'Components' },
      { id: 'printers', labelKey: 'subCategories.printers', icon: 'print', fallback: 'Printers & Scanners' },
      { id: 'networking', labelKey: 'subCategories.networking', icon: 'wifi', fallback: 'Networking' },
      { id: 'software', labelKey: 'subCategories.software', icon: 'code-slash', fallback: 'Software' },
    ],
  },
  {
    key: 'Fashion',
    id: 'fashion',
    labelKey: 'categories.fashion',
    fallback: 'Fashion',
    icon: 'shirt',
    subCategories: [
      { id: 'mens-clothing', labelKey: 'subCategories.mensClothing', icon: 'person', fallback: "Men's Clothing" },
      { id: 'womens-clothing', labelKey: 'subCategories.womensClothing', icon: 'woman', fallback: "Women's Clothing" },
      { id: 'shoes', labelKey: 'subCategories.shoes', icon: 'footsteps', fallback: 'Shoes' },
      { id: 'bags', labelKey: 'subCategories.bags', icon: 'bag', fallback: 'Bags' },
      { id: 'watches-jewelry', labelKey: 'subCategories.watchesJewelry', icon: 'watch', fallback: 'Watches & Jewelry' },
      { id: 'traditional-wear', labelKey: 'subCategories.traditionalWear', icon: 'shirt', fallback: 'Traditional Wear' },
    ],
  },
  {
    key: 'Beauty',
    id: 'beauty',
    labelKey: 'categories.beauty',
    fallback: 'Beauty',
    icon: 'sparkles',
    subCategories: [
      { id: 'skincare', labelKey: 'subCategories.skincare', icon: 'water', fallback: 'Skincare' },
      { id: 'makeup', labelKey: 'subCategories.makeup', icon: 'color-palette', fallback: 'Makeup' },
      { id: 'haircare', labelKey: 'subCategories.haircare', icon: 'cut', fallback: 'Haircare' },
      { id: 'fragrances', labelKey: 'subCategories.fragrances', icon: 'flower', fallback: 'Fragrances' },
      { id: 'beauty-tools', labelKey: 'subCategories.beautyTools', icon: 'brush', fallback: 'Beauty Tools' },
    ],
  },
  {
    key: 'Home & Furniture',
    id: 'home-furniture',
    labelKey: 'categories.homeFurniture',
    fallback: 'Home & Furniture',
    icon: 'bed',
    subCategories: [
      { id: 'sofas-chairs', labelKey: 'subCategories.sofasChairs', icon: 'home', fallback: 'Sofas & Chairs' },
      { id: 'beds-mattresses', labelKey: 'subCategories.bedsMattresses', icon: 'bed', fallback: 'Beds & Mattresses' },
      { id: 'tables-desks', labelKey: 'subCategories.tablesDesks', icon: 'grid', fallback: 'Tables & Desks' },
      { id: 'wardrobes', labelKey: 'subCategories.wardrobes', icon: 'archive', fallback: 'Wardrobes & Storage' },
      { id: 'kitchen', labelKey: 'subCategories.kitchen', icon: 'restaurant', fallback: 'Kitchen & Dining' },
      { id: 'decor', labelKey: 'subCategories.decor', icon: 'color-wand', fallback: 'Home Decor' },
      { id: 'home-appliances', labelKey: 'subCategories.homeAppliances', icon: 'snow', fallback: 'Home Appliances' },
      { id: 'office-furniture', labelKey: 'subCategories.officeFurniture', icon: 'briefcase', fallback: 'Office Furniture' },
    ],
  },
  {
    key: 'Jobs',
    id: 'jobs',
    labelKey: 'categories.jobs',
    fallback: 'Jobs',
    icon: 'briefcase',
    subCategories: [
      { id: 'full-time', labelKey: 'subCategories.fullTime', icon: 'briefcase', fallback: 'Full-Time' },
      { id: 'part-time', labelKey: 'subCategories.partTime', icon: 'time', fallback: 'Part-Time' },
      { id: 'freelance', labelKey: 'subCategories.freelance', icon: 'laptop', fallback: 'Freelance' },
      { id: 'internships', labelKey: 'subCategories.internships', icon: 'school', fallback: 'Internships' },
      { id: 'remote', labelKey: 'subCategories.remote', icon: 'globe', fallback: 'Remote' },
    ],
  },
  {
    key: 'Services',
    id: 'services',
    labelKey: 'categories.services',
    fallback: 'Services',
    icon: 'construct',
    subCategories: [
      { id: 'cleaning', labelKey: 'subCategories.cleaning', icon: 'sparkles', fallback: 'Cleaning' },
      { id: 'electrical', labelKey: 'subCategories.electrical', icon: 'flash', fallback: 'Electrical' },
      { id: 'plumbing', labelKey: 'subCategories.plumbing', icon: 'water', fallback: 'Plumbing' },
      { id: 'graphic-design', labelKey: 'subCategories.graphicDesign', icon: 'color-palette', fallback: 'Graphic Design' },
      { id: 'tutoring', labelKey: 'subCategories.tutoring', icon: 'school', fallback: 'Tutoring' },
      { id: 'photography', labelKey: 'subCategories.photography', icon: 'camera', fallback: 'Photography' },
      { id: 'beauty-services', labelKey: 'subCategories.beautyServices', icon: 'sparkles', fallback: 'Beauty Services' },
    ],
  },
  {
    key: 'Food',
    id: 'food',
    labelKey: 'categories.food',
    fallback: 'Food',
    icon: 'restaurant',
    subCategories: [
      { id: 'restaurants', labelKey: 'subCategories.restaurants', icon: 'restaurant', fallback: 'Restaurants' },
      { id: 'catering', labelKey: 'subCategories.catering', icon: 'fast-food', fallback: 'Catering' },
      { id: 'groceries', labelKey: 'subCategories.groceries', icon: 'cart', fallback: 'Groceries' },
      { id: 'bakery', labelKey: 'subCategories.bakery', icon: 'pizza', fallback: 'Bakery & Sweets' },
      { id: 'beverages', labelKey: 'subCategories.beverages', icon: 'wine', fallback: 'Beverages' },
    ],
  },
  {
    key: 'Agriculture',
    id: 'agriculture',
    labelKey: 'categories.agriculture',
    fallback: 'Agriculture',
    icon: 'leaf',
    subCategories: [
      { id: 'crops', labelKey: 'subCategories.crops', icon: 'leaf', fallback: 'Crops & Produce' },
      { id: 'seeds', labelKey: 'subCategories.seeds', icon: 'flower', fallback: 'Seeds' },
      { id: 'fertilizers', labelKey: 'subCategories.fertilizers', icon: 'flask', fallback: 'Fertilizers' },
      { id: 'farm-equipment', labelKey: 'subCategories.farmEquipment', icon: 'construct', fallback: 'Farm Equipment' },
      { id: 'livestock-feed', labelKey: 'subCategories.livestockFeed', icon: 'nutrition', fallback: 'Livestock Feed' },
    ],
  },
  {
    key: 'Animals & Pets',
    id: 'animals-pets',
    labelKey: 'categories.animalsPets',
    fallback: 'Animals & Pets',
    icon: 'paw',
    subCategories: [
      { id: 'dogs', labelKey: 'subCategories.dogs', icon: 'paw', fallback: 'Dogs' },
      { id: 'cats', labelKey: 'subCategories.cats', icon: 'paw', fallback: 'Cats' },
      { id: 'birds', labelKey: 'subCategories.birds', icon: 'leaf', fallback: 'Birds' },
      { id: 'livestock', labelKey: 'subCategories.livestock', icon: 'paw', fallback: 'Livestock' },
      { id: 'pet-accessories', labelKey: 'subCategories.petAccessories', icon: 'bag', fallback: 'Pet Accessories' },
      { id: 'pet-food', labelKey: 'subCategories.petFood', icon: 'nutrition', fallback: 'Pet Food' },
    ],
  },
  {
    key: 'Baby & Kids',
    id: 'baby-kids',
    labelKey: 'categories.babyKids',
    fallback: 'Baby & Kids',
    icon: 'happy',
    subCategories: [
      { id: 'baby-clothing', labelKey: 'subCategories.babyClothing', icon: 'shirt', fallback: 'Baby Clothing' },
      { id: 'toys', labelKey: 'subCategories.toys', icon: 'game-controller', fallback: 'Toys' },
      { id: 'strollers', labelKey: 'subCategories.strollers', icon: 'bicycle', fallback: 'Strollers & Car Seats' },
      { id: 'school-supplies', labelKey: 'subCategories.schoolSupplies', icon: 'school', fallback: 'School Supplies' },
      { id: 'baby-food', labelKey: 'subCategories.babyFood', icon: 'nutrition', fallback: 'Baby Food' },
    ],
  },
  {
    key: 'Sports & Fitness',
    id: 'sports-fitness',
    labelKey: 'categories.sportsFitness',
    fallback: 'Sports & Fitness',
    icon: 'barbell',
    subCategories: [
      { id: 'gym-equipment', labelKey: 'subCategories.gymEquipment', icon: 'barbell', fallback: 'Gym Equipment' },
      { id: 'cycling', labelKey: 'subCategories.cycling', icon: 'bicycle', fallback: 'Cycling' },
      { id: 'outdoor', labelKey: 'subCategories.outdoor', icon: 'trail-sign', fallback: 'Outdoor & Camping' },
      { id: 'team-sports', labelKey: 'subCategories.teamSports', icon: 'football', fallback: 'Team Sports' },
      { id: 'sports-apparel', labelKey: 'subCategories.sportsApparel', icon: 'shirt', fallback: 'Sports Apparel' },
    ],
  },
  {
    key: 'Business & Industrial',
    id: 'business-industrial',
    labelKey: 'categories.businessIndustrial',
    fallback: 'Business & Industrial',
    icon: 'business',
    subCategories: [
      { id: 'office-equipment', labelKey: 'subCategories.officeEquipment', icon: 'briefcase', fallback: 'Office Equipment' },
      { id: 'machinery', labelKey: 'subCategories.machinery', icon: 'cog', fallback: 'Machinery' },
      { id: 'wholesale', labelKey: 'subCategories.wholesale', icon: 'cube', fallback: 'Wholesale' },
      { id: 'industrial-tools', labelKey: 'subCategories.industrialTools', icon: 'hammer', fallback: 'Industrial Tools' },
    ],
  },
  {
    key: 'Events & Tickets',
    id: 'events-tickets',
    labelKey: 'categories.eventsTickets',
    fallback: 'Events & Tickets',
    icon: 'ticket',
    subCategories: [
      { id: 'concerts', labelKey: 'subCategories.concerts', icon: 'musical-notes', fallback: 'Concerts' },
      { id: 'sports-events', labelKey: 'subCategories.sportsEvents', icon: 'football', fallback: 'Sports Events' },
      { id: 'theater', labelKey: 'subCategories.theater', icon: 'film', fallback: 'Theater & Arts' },
      { id: 'festivals', labelKey: 'subCategories.festivals', icon: 'sparkles', fallback: 'Festivals' },
      { id: 'conferences', labelKey: 'subCategories.conferences', icon: 'people', fallback: 'Conferences' },
    ],
  },
  {
    key: 'Education',
    id: 'education',
    labelKey: 'categories.education',
    fallback: 'Education',
    icon: 'school',
    subCategories: [
      { id: 'books', labelKey: 'subCategories.books', icon: 'book', fallback: 'Books' },
      { id: 'courses', labelKey: 'subCategories.courses', icon: 'play', fallback: 'Courses' },
      { id: 'tutoring-edu', labelKey: 'subCategories.tutoringEdu', icon: 'school', fallback: 'Tutoring' },
      { id: 'stationery', labelKey: 'subCategories.stationery', icon: 'create', fallback: 'Stationery' },
    ],
  },
  {
    key: 'Travel',
    id: 'travel',
    labelKey: 'categories.travel',
    fallback: 'Travel',
    icon: 'airplane',
    subCategories: [
      { id: 'flights', labelKey: 'subCategories.flights', icon: 'airplane', fallback: 'Flights' },
      { id: 'hotels', labelKey: 'subCategories.hotels', icon: 'bed', fallback: 'Hotels & Lodges' },
      { id: 'tours', labelKey: 'subCategories.tours', icon: 'compass', fallback: 'Tours & Safaris' },
      { id: 'luggage', labelKey: 'subCategories.luggage', icon: 'bag', fallback: 'Luggage' },
      { id: 'travel-gear', labelKey: 'subCategories.travelGear', icon: 'briefcase', fallback: 'Travel Gear' },
    ],
  },
  {
    key: 'Construction',
    id: 'construction',
    labelKey: 'categories.construction',
    fallback: 'Construction',
    icon: 'hammer',
    subCategories: [
      { id: 'building-materials', labelKey: 'subCategories.buildingMaterials', icon: 'cube', fallback: 'Building Materials' },
      { id: 'cement-mixers', labelKey: 'subCategories.cementMixers', icon: 'reload', fallback: 'Cement Mixers' },
      { id: 'generators', labelKey: 'subCategories.generators', icon: 'flash', fallback: 'Generators' },
      { id: 'excavators', labelKey: 'subCategories.excavators', icon: 'hammer', fallback: 'Excavators' },
      { id: 'power-tools', labelKey: 'subCategories.powerTools', icon: 'hardware-chip', fallback: 'Power Tools' },
      { id: 'drilling-machines', labelKey: 'subCategories.drillingMachines', icon: 'build', fallback: 'Drilling Machines' },
    ],
  },
  {
    key: 'Repair Services',
    id: 'repair-services',
    labelKey: 'categories.repairServices',
    fallback: 'Repair Services',
    icon: 'build',
    subCategories: [
      { id: 'car-repair', labelKey: 'subCategories.carRepair', icon: 'car', fallback: 'Car Repair' },
      { id: 'phone-repair', labelKey: 'subCategories.phoneRepair', icon: 'phone-portrait', fallback: 'Phone Repair' },
      { id: 'appliance-repair', labelKey: 'subCategories.applianceRepair', icon: 'snow', fallback: 'Appliance Repair' },
      { id: 'plumbing-repair', labelKey: 'subCategories.plumbingRepair', icon: 'water', fallback: 'Plumbing' },
      { id: 'electrical-repair', labelKey: 'subCategories.electricalRepair', icon: 'flash', fallback: 'Electrical' },
    ],
  },
  {
    key: 'Rentals',
    id: 'rentals',
    labelKey: 'categories.rentals',
    fallback: 'Rentals',
    icon: 'key',
    subCategories: [
      { id: 'equipment-rentals', labelKey: 'subCategories.equipmentRentals', icon: 'construct', fallback: 'Equipment Rentals' },
      { id: 'car-rentals', labelKey: 'subCategories.carRentals', icon: 'car', fallback: 'Car Rentals' },
      { id: 'property-rentals', labelKey: 'subCategories.propertyRentals', icon: 'home', fallback: 'Property Rentals' },
      { id: 'event-rentals', labelKey: 'subCategories.eventRentals', icon: 'ticket', fallback: 'Event Rentals' },
    ],
  },
  {
    key: 'Entertainment',
    id: 'entertainment',
    labelKey: 'categories.entertainment',
    fallback: 'Entertainment',
    icon: 'musical-notes',
    subCategories: [
      { id: 'music', labelKey: 'subCategories.music', icon: 'musical-notes', fallback: 'Music' },
      { id: 'movies', labelKey: 'subCategories.movies', icon: 'film', fallback: 'Movies & DVDs' },
      { id: 'games', labelKey: 'subCategories.games', icon: 'game-controller', fallback: 'Games' },
      { id: 'instruments', labelKey: 'subCategories.instruments', icon: 'musical-note', fallback: 'Musical Instruments' },
      { id: 'art-collectibles', labelKey: 'subCategories.artCollectibles', icon: 'color-palette', fallback: 'Art & Collectibles' },
    ],
  },
  {
    key: 'Community',
    id: 'community',
    labelKey: 'categories.community',
    fallback: 'Community',
    icon: 'people',
    subCategories: [
      { id: 'lost-found', labelKey: 'subCategories.lostFound', icon: 'help-circle', fallback: 'Lost & Found' },
      { id: 'free-items', labelKey: 'subCategories.freeItems', icon: 'gift', fallback: 'Free Items' },
      { id: 'volunteers', labelKey: 'subCategories.volunteers', icon: 'people', fallback: 'Volunteers' },
      { id: 'announcements', labelKey: 'subCategories.announcements', icon: 'megaphone', fallback: 'Announcements' },
    ],
  },
  {
    key: 'Other',
    id: 'other',
    labelKey: 'categories.other',
    fallback: 'Other',
    icon: 'ellipsis-horizontal',
    subCategories: [],
  },
];

/**
 * Legacy category aliases — old categories that were merged or renamed.
 * Both display name (Firestore `category` field) and slug (`categoryId`
 * field) lookups must resolve, so we map both.
 *
 * When an old listing's category is read, it should display under its new
 * home. When the user filters by a new category, query results expand to
 * include legacy IDs.
 */
export const LEGACY_CATEGORY_ALIASES = {
  // by display name
  'Furniture': 'Home & Furniture',
  'Home Appliances': 'Home & Furniture',
  'Construction Equipment': 'Construction',
  'Art & Collectibles': 'Entertainment',
  // by slug
  'furniture': 'home-furniture',
  'home-appliances': 'home-furniture',
  'construction-equipment': 'construction',
  'art-collectibles': 'entertainment',
};

/**
 * Reverse alias map: for a given new category id, which legacy ids should
 * also be queried? Used by `searchListings` to surface old listings.
 */
export const LEGACY_REVERSE_ALIASES = (() => {
  const reverse = {};
  for (const [legacy, modern] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
    // Only collect slug aliases (lowercase, hyphenated)
    if (legacy === legacy.toLowerCase() && !/\s/.test(legacy)) {
      if (!reverse[modern]) reverse[modern] = [];
      reverse[modern].push(legacy);
    }
  }
  return reverse;
})();

// ---- Derived lookups (memoized at module load) ----

const BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/** Resolve a category key (which may be a legacy name) to its canonical key. */
export function resolveCategoryKey(key) {
  if (!key) return null;
  return LEGACY_CATEGORY_ALIASES[key] || key;
}

/** Resolve a category id (may be a legacy slug) to its canonical id. */
export function resolveCategoryId(id) {
  if (!id) return null;
  return LEGACY_CATEGORY_ALIASES[id] || id;
}

/** Look up the full category record by canonical key. */
export function getCategoryByKey(key) {
  return BY_KEY[resolveCategoryKey(key)] || null;
}

/** Look up the full category record by canonical id. */
export function getCategoryById(id) {
  return BY_ID[resolveCategoryId(id)] || null;
}

/** Get subcategories for a category (accepts new or legacy name). */
export function getSubCategories(mainCategory) {
  const cat = getCategoryByKey(mainCategory);
  return cat?.subCategories || [];
}

/** Get the Ionicons name for a category (accepts new or legacy name). */
export function getCategoryIcon(mainCategory) {
  return getCategoryByKey(mainCategory)?.icon || 'apps';
}

/** Get all legacy ids that should be included when querying a modern id. */
export function getLegacyAliasesFor(canonicalId) {
  return LEGACY_REVERSE_ALIASES[canonicalId] || [];
}

/**
 * Find a subcategory record by its id, searching every category. Returns
 * { sub, parent } when found so callers can render both the localized
 * subcategory label and (optionally) its parent category. Returns null if
 * the id matches no known subcategory — caller should then fall back to the
 * raw stored value (legacy data).
 */
export function findSubCategoryById(subId) {
  if (!subId) return null;
  for (const cat of CATEGORIES) {
    const sub = cat.subCategories.find((s) => s.id === subId);
    if (sub) return { sub, parent: cat };
  }
  return null;
}

/**
 * Backward-compat object form keyed by category display name.
 * Kept because some legacy code paths consume it directly.
 */
export const CATEGORIES_WITH_SUBS = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, { icon: c.icon, subCategories: c.subCategories }])
);
