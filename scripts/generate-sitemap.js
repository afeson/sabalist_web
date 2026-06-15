/* eslint-disable no-console */
/**
 * Generates public/sitemap.xml with the real public marketplace URLs:
 *   - homepage + static pages (about / terms / help)
 *   - one URL per top-level category (/category/<id>)
 *   - one URL per active listing (/listing/<id>) read live from Firestore
 *
 * Runs at build time (see the `build` / `vercel-build` scripts in package.json),
 * BEFORE the public/ → dist copy step. Listings are world-readable
 * (firestore.rules: `match /listings { allow read: if true }`), so no service
 * account is needed — only the public EXPO_PUBLIC_FIREBASE_* config, the same
 * config the web app ships with. (The previous version required firebase-admin
 * + GOOGLE_APPLICATION_CREDENTIALS, which isn't installed, and hardcoded a
 * stale category list — both fixed here.)
 *
 * Failure is non-fatal: if config/network is unavailable the existing
 * sitemap.xml is left untouched so a deploy never breaks over SEO metadata.
 */
const fs = require('fs');
const path = require('path');

// Load env the same way the web build does. Prefer production env, fall back
// to the default .env. Missing files are ignored by dotenv.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.production') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SITE_URL = (process.env.SITE_URL || 'https://sabalist.com').replace(/\/$/, '');
const OUT_FILE = path.resolve(__dirname, '../public/sitemap.xml');
const CATEGORIES_FILE = path.resolve(__dirname, '../src/config/categories.js');

const STATIC_PAGES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
  { loc: '/help', changefreq: 'monthly', priority: '0.3' },
];

// Extract top-level category ids from the source of truth without importing the
// ESM module. Each top-level category is `key: '...'` immediately followed by
// `id: '...'`; sub-categories have `id` but no preceding `key`, so this matches
// only the top-level entries and stays in sync with src/config/categories.js.
function readCategoryIds() {
  try {
    const src = fs.readFileSync(CATEGORIES_FILE, 'utf8');
    const re = /key:\s*'[^']*',\s*[\r\n]+\s*id:\s*'([^']+)'/g;
    const ids = [];
    let m;
    while ((m = re.exec(src)) !== null) ids.push(m[1]);
    return ids;
  } catch (e) {
    console.warn('[sitemap] Could not read category ids:', e.message);
    return [];
  }
}

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

function urlTag({ loc, changefreq, priority, lastmod }) {
  const parts = [`<loc>${xmlEscape(SITE_URL + loc)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`<priority>${priority}</priority>`);
  return `  <url>${parts.join('')}</url>`;
}

async function fetchActiveListings() {
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
  };
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing EXPO_PUBLIC_FIREBASE_* config; skipping listing URLs');
  }

  // Dynamic import keeps this CommonJS script compatible with firebase's ESM.
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs } = await import('firebase/firestore');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  // Fetch the whole collection (no where/orderBy) so legacy docs without a
  // `status` field are included and no composite index is required.
  const snap = await getDocs(collection(db, 'listings'));

  const listings = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    // Active = explicitly active, or legacy docs with no status field.
    if (d.status && d.status !== 'active') return;
    let lastmod;
    const ts = d.updatedAt || d.createdAt;
    try {
      if (ts && typeof ts.toDate === 'function') {
        lastmod = ts.toDate().toISOString().slice(0, 10);
      }
    } catch {}
    listings.push({ id: doc.id, lastmod });
  });
  return listings;
}

async function main() {
  const categoryIds = readCategoryIds();

  const urls = [
    ...STATIC_PAGES.map(urlTag),
    ...categoryIds.map((id) =>
      urlTag({ loc: `/category/${id}`, changefreq: 'daily', priority: '0.8' })
    ),
  ];

  let listingCount = 0;
  try {
    const listings = await fetchActiveListings();
    const MAX = 45000; // sitemap spec hard limit is 50k URLs per file
    if (listings.length > MAX) {
      console.warn(`[sitemap] ${listings.length} listings exceeds ${MAX}; truncating.`);
    }
    for (const l of listings.slice(0, MAX)) {
      urls.push(
        urlTag({ loc: `/listing/${l.id}`, changefreq: 'weekly', priority: '0.7', lastmod: l.lastmod })
      );
      listingCount++;
    }
  } catch (e) {
    console.warn('[sitemap] Skipping dynamic listing URLs:', e.message);
    // Keep the existing sitemap rather than overwrite it with a thin one.
    if (fs.existsSync(OUT_FILE)) {
      console.warn('[sitemap] Left existing sitemap.xml in place.');
      return;
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(OUT_FILE, xml, 'utf8');
  console.log(
    `[sitemap] Wrote ${urls.length} URLs (${STATIC_PAGES.length} static, ` +
      `${categoryIds.length} categories, ${listingCount} listings) → ${OUT_FILE} @ ${SITE_URL}`
  );
}

main().catch((e) => {
  // Never fail the build over the sitemap.
  console.warn('[sitemap] Generation failed (non-fatal):', e.message);
  process.exit(0);
});
