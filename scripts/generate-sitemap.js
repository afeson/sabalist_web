/**
 * Dynamic Sitemap Generator
 *
 * Queries Firestore for all active listings and generates a complete sitemap.xml
 * Run manually: node scripts/generate-sitemap.js
 * Or add to CI/CD pipeline for automated updates.
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to Firebase service account key
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://sabalist.web.app';

// Category ID mapping (mirrors src/config/categoryMapping.js)
const CATEGORY_ID_MAP = {
  'Electronics': 'electronics',
  'Vehicles': 'vehicles',
  'Furniture': 'furniture',
  'Home Appliances': 'home-appliances',
  'Construction Equipment': 'construction-equipment',
  'Art & Collectibles': 'art-collectibles',
  'Fashion': 'fashion',
  'Services': 'services',
  'Jobs': 'jobs',
  'Real Estate': 'real-estate',
};

// Subcategories (mirrors src/config/categories.js)
const SUBCATEGORIES = {
  electronics: ['mobile-phones', 'laptops-computers', 'tablets', 'tvs', 'audio-speakers', 'cameras', 'gaming-consoles', 'accessories'],
  vehicles: ['cars', 'motorcycles', 'trucks', 'buses', 'bicycles', 'spare-parts'],
  furniture: ['sofas-chairs', 'beds-mattresses', 'tables-desks', 'wardrobes', 'office-furniture'],
  'home-appliances': ['refrigerators', 'washing-machines', 'microwaves', 'air-conditioners', 'cookers-ovens'],
  'construction-equipment': ['cement-mixers', 'generators', 'excavators', 'drilling-machines', 'power-tools', 'building-materials'],
  'art-collectibles': ['paintings', 'sculptures', 'handmade-art', 'antiques', 'crafts'],
  fashion: ['mens-clothing', 'womens-clothing', 'shoes', 'bags', 'watches-jewelry'],
  services: ['cleaning', 'electrical', 'plumbing', 'car-repair', 'graphic-design', 'tutoring'],
  jobs: ['full-time', 'part-time', 'freelance', 'internships', 'remote'],
  'real-estate': ['houses-sale', 'houses-rent', 'apartments', 'land', 'commercial-property'],
};

function getCategoryId(name) {
  return CATEGORY_ID_MAP[name] || name.toLowerCase().replace(/\s+/g, '-');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, changefreq, priority) {
  return `  <url><loc>${escapeXml(loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

async function generateSitemap() {
  // Initialize Firebase Admin
  try {
    initializeApp();
  } catch (e) {
    // Already initialized
  }

  const db = getFirestore();
  const urls = [];

  // Static pages
  urls.push(urlEntry(`${BASE_URL}/`, 'daily', '1.0'));
  urls.push(urlEntry(`${BASE_URL}/about`, 'monthly', '0.5'));
  urls.push(urlEntry(`${BASE_URL}/terms`, 'monthly', '0.3'));
  urls.push(urlEntry(`${BASE_URL}/help`, 'monthly', '0.3'));

  // Category and subcategory pages
  for (const [catName, catId] of Object.entries(CATEGORY_ID_MAP)) {
    urls.push(urlEntry(`${BASE_URL}/category/${catId}`, 'daily', '0.8'));

    const subs = SUBCATEGORIES[catId] || [];
    for (const sub of subs) {
      urls.push(urlEntry(`${BASE_URL}/category/${catId}/${sub}`, 'daily', '0.7'));
    }
  }

  // Dynamic listing pages from Firestore
  console.log('Querying Firestore for active listings...');
  const listingsSnap = await db.collection('listings')
    .where('status', '==', 'active')
    .get();

  console.log(`Found ${listingsSnap.size} active listings`);

  listingsSnap.forEach((doc) => {
    urls.push(urlEntry(`${BASE_URL}/listing/${doc.id}`, 'weekly', '0.6'));
  });

  // Build XML
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n');

  // Write to dist/ and public/
  const distPath = path.join(__dirname, '..', 'dist', 'sitemap.xml');
  const publicPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

  fs.writeFileSync(publicPath, xml, 'utf8');
  console.log(`Written to ${publicPath}`);

  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.writeFileSync(distPath, xml, 'utf8');
    console.log(`Written to ${distPath}`);
  }

  console.log(`Sitemap generated with ${urls.length} URLs`);
}

generateSitemap().catch((err) => {
  console.error('Sitemap generation failed:', err.message);
  process.exit(1);
});
