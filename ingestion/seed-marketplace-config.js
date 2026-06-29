'use strict';
/**
 * Seed `marketplace_config/live` with the CURRENT bundled defaults so deploying
 * the backend-driven config is behavior-neutral until an admin edits it.
 *
 * Idempotent: if the doc exists, its `version` is bumped and updatedAt refreshed
 * (other fields are overwritten with these defaults — edit the doc via the admin
 * tab, not by re-running this). Run with admin credentials:
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> node ingestion/seed-marketplace-config.js
 *
 * NOTE: values here mirror src/config/* — keep in sync if the bundled defaults
 * change. The app falls back to the bundled config for any field omitted here.
 */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

// Current taxonomy order (must match src/config/categories.js).
const CATEGORY_ORDER = [
  'vehicles', 'real-estate', 'electronics', 'phones-tablets', 'computers', 'fashion',
  'beauty', 'home-furniture', 'jobs', 'services', 'food', 'agriculture', 'animals-pets',
  'baby-kids', 'sports-fitness', 'business-industrial', 'events-tickets', 'education',
  'travel', 'construction', 'repair-services', 'rentals', 'entertainment', 'community', 'other',
];
const CATEGORY_KEYS = [
  'Vehicles', 'Real Estate', 'Electronics', 'Phones & Tablets', 'Computers', 'Fashion',
  'Beauty', 'Home & Furniture', 'Jobs', 'Services', 'Food', 'Agriculture', 'Animals & Pets',
  'Baby & Kids', 'Sports & Fitness', 'Business & Industrial', 'Events & Tickets', 'Education',
  'Travel', 'Construction', 'Repair Services', 'Rentals', 'Entertainment', 'Community', 'Other',
];

// Regions mirror src/config/cityRoutes.js (SEO_COUNTRIES / SEO_CATEGORY_SLUGS).
const REGIONS = {
  countries: {
    ethiopia: { name: 'Ethiopia', cities: {
      'addis-ababa': { name: 'Addis Ababa', matchTerms: ['Addis Ababa', 'Addis'] },
      'dire-dawa': { name: 'Dire Dawa', matchTerms: ['Dire Dawa'] },
      'mekelle': { name: 'Mekelle', matchTerms: ['Mekelle', 'Mekele'] },
      'gondar': { name: 'Gondar', matchTerms: ['Gondar', 'Gonder'] },
    } },
    kenya: { name: 'Kenya', cities: {
      'nairobi': { name: 'Nairobi', matchTerms: ['Nairobi'] },
      'mombasa': { name: 'Mombasa', matchTerms: ['Mombasa'] },
      'kisumu': { name: 'Kisumu', matchTerms: ['Kisumu'] },
      'nakuru': { name: 'Nakuru', matchTerms: ['Nakuru'] },
    } },
    nigeria: { name: 'Nigeria', cities: {
      'lagos': { name: 'Lagos', matchTerms: ['Lagos'] },
      'abuja': { name: 'Abuja', matchTerms: ['Abuja'] },
      'kano': { name: 'Kano', matchTerms: ['Kano'] },
      'ibadan': { name: 'Ibadan', matchTerms: ['Ibadan'] },
      'port-harcourt': { name: 'Port Harcourt', matchTerms: ['Port Harcourt'] },
    } },
    ghana: { name: 'Ghana', cities: {
      'accra': { name: 'Accra', matchTerms: ['Accra'] },
      'kumasi': { name: 'Kumasi', matchTerms: ['Kumasi'] },
      'tamale': { name: 'Tamale', matchTerms: ['Tamale'] },
      'takoradi': { name: 'Takoradi', matchTerms: ['Takoradi', 'Sekondi'] },
    } },
  },
  categorySlugs: {
    electronics: 'Electronics', vehicles: 'Vehicles', furniture: 'Furniture',
    'home-appliances': 'Home Appliances', 'construction-equipment': 'Construction Equipment',
    'art-collectibles': 'Art & Collectibles', fashion: 'Fashion', services: 'Services',
    jobs: 'Jobs', 'real-estate': 'Real Estate',
  },
};

function buildConfig(prevVersion) {
  return {
    version: (prevVersion || 0) + 1,
    schemaVersion: 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'seeder',

    featureFlags: {
      showJobs: true, showBanners: true, enableTrending: true,
      enableReviews: true, monetizationEnabled: false, showRegionsNav: true,
      homePhotoOnly: true, // toggle the photo-only front page from here
    },
    categories: { order: CATEGORY_ORDER, overrides: {} },
    navChips: ['All', ...CATEGORY_KEYS, '__more__'],
    home: {
      sections: [{ id: 'feed', type: 'feed', enabled: true }],
      ranking: {
        tierWeights: { jobs: 0, directory: 1, importNoPhoto: 2, organicNoPhoto: 3, importPhoto: 4, organicPhoto: 5 },
        jobsLast: true,
        directorySourcePrefixes: ['osm-', 'hipolabs-'],
        roundRobin: { enabled: true, leadMinTier: 2 },
        perCategory: { min: 8, divisor: 12 },
      },
      featuredCategories: [],
      trendingCategories: [],
      banners: [],
    },
    filters: { priceRanges: [], attributes: [] },
    sortOptions: [
      { id: 'newest', label: 'Newest', field: 'createdAt', dir: 'desc' },
      { id: 'priceAsc', label: 'Price: Low to High', field: 'price', dir: 'asc' },
      { id: 'priceDesc', label: 'Price: High to Low', field: 'price', dir: 'desc' },
    ],
    regions: REGIONS,
    location: { defaultCountry: null, defaultCity: null, askOnLaunch: true, radiusKm: 50, localeMapEnabled: true },
    ingestion: { sourcePriorities: {}, categoryPriorities: [], disabledSources: [], maxPerRun: null },
    imageLimits: {},
  };
}

(async () => {
  const ref = db.collection('marketplace_config').doc('live');
  const snap = await ref.get();
  const prev = snap.exists ? (snap.data().version || 0) : 0;
  const cfg = buildConfig(prev);
  await ref.set(cfg, { merge: false });
  console.log(`✅ Seeded marketplace_config/live (version ${cfg.version}, schemaVersion ${cfg.schemaVersion}).`);
  console.log(`   categories: ${CATEGORY_ORDER.length}, navChips: ${cfg.navChips.length}, regions: ${Object.keys(REGIONS.countries).length} countries`);
  process.exit(0);
})().catch((e) => { console.error('❌ Seed failed:', e.message); process.exit(1); });
