'use strict';
/**
 * Business bulk-upload importer — CSV / Excel → Sabalist `listings`.
 *
 * A verified business exports its catalogue (title, description, price, image
 * URLs, category, seller, country, city) and this loads it into Firestore with:
 *   - flexible header mapping (title/name/product, image/images/photo, …)
 *   - category mapping to the Sabalist taxonomy + auto subcategory
 *   - duplicate detection + auto-UPDATE of existing rows (idempotent re-uploads)
 *   - per-row error reporting + progress
 *   - business provenance (businessId / sellerName / claimable) for "Claim Business"
 * Scales to thousands per file (batched writes; one read to preload existing).
 *
 * Real data only — every listing is the business's own product; nothing invented.
 *
 * Usage (local):
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> node import-file.js <file.csv|.xlsx> \
 *     --business "Acme Electronics" [--country Nigeria] [--city Lagos] [--dry]
 * CI: set FIREBASE_SERVICE_ACCOUNT instead of GOOGLE_APPLICATION_CREDENTIALS.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const { resolveCategory, classifySubcategory, VALID_SUBS } = require('./lib/taxonomy');
const dedup = require('./lib/dedup');
let enrichGeo; try { enrichGeo = require('./lib/geo').enrichGeo; } catch (_) { enrichGeo = () => ({}); }

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const opt = (name, def = null) => { const i = argv.indexOf('--' + name); if (i < 0) return def; const nxt = argv[i + 1]; return nxt && !nxt.startsWith('--') ? nxt : true; };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';

const DRY = !!opt('dry', false);
const businessName = opt('business') || 'Business';
const businessId = opt('business-id') || ('business-' + slug(businessName));
const sourceId = opt('source') || ('business-' + slug(businessName));
const defCountry = opt('country') || '';
const defCity = opt('city') || '';

if (!file || !fs.existsSync(file)) {
  console.error('Usage: node import-file.js <file.csv|.xlsx> --business "Name" [--country X] [--city Y] [--business-id id] [--dry]');
  process.exit(1);
}

// header alias -> canonical field
const FIELD_ALIASES = {
  title: ['title', 'name', 'product', 'product_name', 'productname', 'item', 'item_name'],
  description: ['description', 'desc', 'details', 'about', 'summary', 'body'],
  price: ['price', 'amount', 'cost', 'value'],
  currency: ['currency', 'cur', 'ccy'],
  images: ['images', 'image', 'image_url', 'image_urls', 'imageurl', 'photo', 'photos', 'picture', 'pictures', 'img'],
  category: ['category', 'cat', 'department', 'category_name'],
  subcategory: ['subcategory', 'subcat', 'sub_category'],
  sellerName: ['seller', 'seller_name', 'business', 'business_name', 'store', 'shop', 'vendor', 'brand'],
  country: ['country'],
  city: ['city', 'town'],
  location: ['location', 'address', 'area', 'place'],
  phoneNumber: ['phone', 'phone_number', 'phonenumber', 'tel', 'mobile', 'whatsapp', 'contact'],
  website: ['website', 'url', 'link', 'web', 'site'],
  email: ['email', 'e_mail', 'mail'],
  externalId: ['id', 'sku', 'external_id', 'externalid', 'product_id', 'productid', 'code', 'ref', 'reference'],
};
const HEADER_MAP = {};
for (const [canon, aliases] of Object.entries(FIELD_ALIASES)) for (const a of aliases) HEADER_MAP[a] = canon;
const normKey = (k) => String(k || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
const splitImages = (s) => String(s || '').split(/[|,;\n]+/).map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x));

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const canon = HEADER_MAP[normKey(k)];
    if (canon && v != null && String(v).trim() !== '') out[canon] = String(v).trim();
  }
  return out;
}

function parseFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (['.csv', '.tsv', '.txt'].includes(ext)) {
    return Papa.parse(fs.readFileSync(fp, 'utf8'), { header: true, skipEmptyLines: true }).data;
  }
  const wb = XLSX.readFile(fp);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
}

(async () => {
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : admin.credential.applicationDefault();
  admin.initializeApp({ credential });
  const db = admin.firestore();

  const rows = parseFile(file);
  console.log(`📄 Parsed ${rows.length} rows from ${path.basename(file)}  (business: "${businessName}", source: ${sourceId})`);

  const errors = [];
  const drafts = [];
  rows.forEach((raw, i) => {
    const rowNo = i + 2; // header is row 1
    const r = normalizeRow(raw);
    if (!r.title) { errors.push({ row: rowNo, error: 'missing title' }); return; }
    const categoryId = resolveCategory(r.category);
    if (!categoryId) { errors.push({ row: rowNo, error: `unmappable category "${r.category || ''}"`, title: r.title }); return; }
    const images = splitImages(r.images);
    let subcategory = (r.subcategory && VALID_SUBS[categoryId] && VALID_SUBS[categoryId].has(r.subcategory)) ? r.subcategory : '';
    if (!subcategory) subcategory = classifySubcategory(categoryId, r.title, r.description, sourceId) || '';
    const amountRaw = r.price != null && r.price !== '' ? Number(String(r.price).replace(/[^0-9.]/g, '')) : NaN;
    const country = r.country || defCountry || '';
    const city = r.city || defCity || '';
    const draft = {
      title: r.title, description: r.description || '',
      amount: Number.isFinite(amountRaw) ? amountRaw : null,
      currency: (r.currency || 'USD').toUpperCase(),
      categoryId, subcategory, images, coverImage: images[0] || '',
      country, city, location: r.location || [city, country].filter(Boolean).join(', '),
      phoneNumber: r.phoneNumber || '', website: r.website || '', email: r.email || '',
      sellerName: r.sellerName || businessName, externalId: r.externalId || '',
    };
    try { Object.assign(draft, enrichGeo(draft)); } catch (_) {}
    drafts.push(draft);
  });

  console.log(`✔ valid rows: ${drafts.length}  |  ✖ errors: ${errors.length}`);

  // Preload existing listings for THIS source (one read) → in-memory dedup.
  const existing = new Map(); // sourceKey -> { id, fingerprint }
  const snap = await db.collection('listings').where('source', '==', sourceId).get();
  snap.forEach((d) => { const x = d.data(); if (x.sourceKey) existing.set(x.sourceKey, { id: d.id, fingerprint: x.fingerprint }); });
  console.log(`↺ existing listings for this business/source: ${existing.size}`);

  const now = new Date().toISOString();
  let inserted = 0, updated = 0, unchanged = 0;
  let batch = db.batch(), ops = 0;
  const flush = async () => { if (ops > 0 && !DRY) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const seenKeys = new Set(); // guard against dupes WITHIN the same file

  for (let idx = 0; idx < drafts.length; idx++) {
    const d = drafts[idx];
    const sourceKey = dedup.sourceKey(sourceId, { externalId: d.externalId, title: d.title, price: d.amount, location: d.location });
    const fingerprint = dedup.fingerprint(d);
    if (seenKeys.has(sourceKey)) { unchanged++; continue; } // duplicate row inside the file
    seenKeys.add(sourceKey);
    const doc = {
      title: d.title, description: d.description,
      price: Number(d.amount) || 0, amount: Number.isFinite(d.amount) ? d.amount : null,
      priceType: Number(d.amount) > 0 ? 'fixed' : 'none', currency: d.currency,
      categoryId: d.categoryId, category: d.categoryId, subcategory: d.subcategory,
      country: d.country, countryCode: d.countryCode || '', region: d.region || '', city: d.city, location: d.location,
      images: d.images, coverImage: d.coverImage, hasImage: !!(d.coverImage || d.images.length),
      phoneNumber: d.phoneNumber, website: d.website, email: d.email,
      status: 'active', views: 0, language: d.language || 'en',
      source: sourceId, sourceKey, fingerprint, sourceUrl: d.website || '',
      userId: businessId, businessId, sellerName: d.sellerName,
      businessVerified: false, claimable: true,
      updatedAt: now,
    };
    const ex = existing.get(sourceKey);
    if (ex) {
      if (ex.fingerprint && ex.fingerprint === fingerprint) { unchanged++; continue; }
      if (!DRY) { batch.set(db.collection('listings').doc(ex.id), doc, { merge: true }); ops++; }
      updated++;
    } else {
      doc.importedAt = now; doc.createdAt = now;
      if (!DRY) { batch.set(db.collection('listings').doc(), doc); ops++; }
      inserted++;
    }
    if (ops >= 400) await flush();
    if ((idx + 1) % 500 === 0) console.log(`  … processed ${idx + 1}/${drafts.length}`);
  }
  await flush();

  console.log(`\n===== IMPORT REPORT${DRY ? ' (DRY RUN — no writes)' : ''} =====`);
  console.log(`rows ${rows.length} | valid ${drafts.length} | inserted ${inserted} | updated ${updated} | unchanged ${unchanged} | errors ${errors.length}`);
  if (errors.length) { console.log('\nerrors (first 25):'); errors.slice(0, 25).forEach((e) => console.log(`  row ${e.row}: ${e.error}${e.title ? ` [${e.title}]` : ''}`)); }
  process.exit(0);
})().catch((e) => { console.error('IMPORT FAILED:', e.message); process.exit(1); });
