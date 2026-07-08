'use strict';
/**
 * The ingestion pipeline. For each raw record from a source it runs:
 *   map -> normalize -> geo/currency/language -> categorize -> image-verify
 *   -> dedup -> quality/spam score -> ROUTE
 *
 * Routing:
 *   - reject            : spam, or fatally invalid (no title/category)
 *   - update            : same source listing seen before -> upsert existing
 *   - publish           : high confidence + good quality + not duplicate
 *   - review            : duplicates/uncertain/low-quality/low-confidence
 *
 * The pipeline is storage-agnostic: pass a `store` with async helpers so it can
 * be unit-tested with an in-memory store and run for real with Firestore.
 */

const { mapRecord } = require('./mappingEngine');
const { enrichGeo } = require('./geo');
const { categorize, resolveCategory, classifySubcategory, VALID_SUBS } = require('./taxonomy');
const { scoreQuality } = require('./quality');
const dedup = require('./dedup');
const normalize = require('./normalize');
const match = require('./match');
const { buildSearchFields } = require('./searchKeywords');

const DEFAULTS = {
  autoPublishQuality: 0.75,   // min quality score to auto-publish
  autoPublishConfidence: 0.7, // min category confidence to auto-publish
  expireAfterDays: 90,        // listings not seen for this long are expired
};

function isHttpUrl(u) { return /^https?:\/\/\S+$/i.test(String(u || '')); }

/** Verify images structurally (cheap). Network HEAD checks happen in the worker. */
function verifyImages(images = []) {
  const valid = (images || []).filter(isHttpUrl);
  return { images: valid, removed: (images || []).length - valid.length };
}

// Stable business id from a name — MUST match the /api/claim search slug so an
// owner searching their business name finds these imported listings.
function slugBusinessId(s) {
  return 'business-' + (String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x');
}

/** Build the canonical Sabalist listing document from a processed draft. */
function toListingDoc(draft, meta) {
  return {
    title: draft.title || '',
    description: draft.description || '',
    price: Number(draft.amount ?? draft.price) || 0,
    amount: Number(draft.amount ?? draft.price) || null,
    priceType: draft.priceType || (Number(draft.amount ?? draft.price) > 0 ? 'fixed' : 'none'),
    currency: draft.currency || 'USD',
    category: draft.categoryLabel || draft.category || '',
    categoryId: draft.categoryId || '',
    subcategory: draft.subcategory || '',
    country: draft.country || '',
    countryCode: draft.countryCode || '',
    region: draft.region || '',
    city: draft.city || '',
    // Coordinates (when the source provides them) — foundational for geo-radius
    // search (Typesense geopoint) and geohash dedup blocking. Null when absent.
    latitude: typeof draft.latitude === 'number' ? draft.latitude : null,
    longitude: typeof draft.longitude === 'number' ? draft.longitude : null,
    // Dedup v2 blocking/identity keys (Phase 3).
    geohash6: normalize.geohashOf(draft.latitude, draft.longitude, 6),
    geohash7: normalize.geohashOf(draft.latitude, draft.longitude, 7),
    phoneE164: normalize.phoneE164(draft.phoneNumber, draft.countryCode),
    domain: normalize.domainOf(draft.website || draft.url || draft.sourceUrl),
    nameNorm: normalize.nameNorm(draft.title).norm,
    nameKey: normalize.nameNorm(draft.title).key,
    // $0 Firestore search fallback fields (lib/searchKeywords.js): token array
    // for array-contains-any keyword search + lowercase title for prefix
    // autocomplete. Every engine can also index these.
    ...buildSearchFields({
      title: draft.title,
      categoryId: draft.categoryId,
      subcategory: draft.subcategory,
      location: draft.location || [draft.city, draft.country].filter(Boolean).join(', '),
      country: draft.country,
    }),
    location: draft.location || [draft.city, draft.country].filter(Boolean).join(', '),
    language: draft.language || 'en',
    phoneNumber: draft.phoneNumber || '',
    website: draft.website || '',
    email: draft.email || '',
    images: draft.images || [],
    coverImage: draft.coverImage || (draft.images || [])[0] || '',
    hasImage: !!(draft.coverImage || (draft.images && draft.images.length)),
    status: 'active',
    type: 'business', // Option A discriminator (Business Engine → businesses collection)
    views: 0,
    // provenance + dedup metadata (kept on the doc for re-sync + audits)
    source: meta.sourceId,
    sourceKey: meta.sourceKey,
    fingerprint: meta.fingerprint,
    sourceUrl: draft.url || draft.link || '',
    userId: meta.ownerUserId,
    importedAt: meta.now,
    updatedAt: meta.now,
    qualityScore: meta.qualityScore,
    // Business-directory sources (e.g. OSM shops): make the imported business
    // claimable so an owner can take it over via /claim and then add real
    // product listings with the AI Listing Assistant. Non-business sources
    // (jobs, products, events) are unaffected.
    ...(meta.business ? {
      sellerName: draft.title || '',
      businessId: slugBusinessId(draft.title),
      claimable: true,
      businessVerified: false,
    } : {}),
  };
}

/**
 * Process a single raw record. Returns { decision, reason, listing, matchId, meta }.
 * `store.findCandidates(record)` should return existing docs that could match
 * (by sourceKey or fingerprint/category) — keep it indexed for scale.
 */
async function processRecord(raw, source, store, opts = {}) {
  const cfg = { ...DEFAULTS, ...(source.thresholds || {}), ...opts };
  const now = opts.now || new Date().toISOString();

  // 1) MAP
  const draft = mapRecord(raw, source.mapping || {});

  // 2) GEO / CURRENCY / LANGUAGE
  Object.assign(draft, enrichGeo(draft));

  // 3) CATEGORIZE (respect explicit source category, else infer)
  const explicit = resolveCategory(draft.category);
  const cat = explicit
    ? { categoryId: explicit, subcategory: draft.subcategory || null, confidence: 0.95 }
    : categorize({ title: draft.title, description: draft.description, rawCategory: draft.category });
  draft.categoryId = cat.categoryId;
  if (cat.subcategory && !draft.subcategory) draft.subcategory = cat.subcategory;
  // Ensure every listing lands in a subcategory section: if none was provided/
  // inferred, or the provided one isn't valid for this category, classify from text.
  const validSet = VALID_SUBS[draft.categoryId];
  if (draft.categoryId && validSet && validSet.size && (!draft.subcategory || !validSet.has(draft.subcategory))) {
    const sub = classifySubcategory(draft.categoryId, draft.title, draft.description, draft.source || source.id);
    if (sub) draft.subcategory = sub;
  }
  const confidence = cat.confidence;

  // 4) IMAGE VERIFY (structural)
  const img = verifyImages(draft.images);
  draft.images = img.images;
  draft.coverImage = draft.images[0] || '';

  // 5) QUALITY / SPAM
  const q = scoreQuality(draft);

  // identity + fingerprint
  const sourceKey = dedup.sourceKey(source.id, raw);
  const fingerprint = dedup.fingerprint(draft);
  const meta = { sourceId: source.id, sourceKey, fingerprint, ownerUserId: source.ownerUserId, now, qualityScore: q.score, business: !!source.business };

  // Hard rejects.
  if (q.isSpam) return { decision: 'reject', reason: 'spam', meta, issues: q.issues };
  if (!draft.title || !draft.categoryId) {
    return { decision: 'review', reason: 'missing_required', listing: toListingDoc(draft, meta), confidence, quality: q, meta };
  }

  // 6) DEDUP v2 — block by sourceKey/fingerprint/geohash/phone/domain, then score
  // candidates with lib/match.js (name + geo + phone/domain + category).
  const nm = normalize.nameNorm(draft.title);
  const gh7 = normalize.geohashOf(draft.latitude, draft.longitude, 7);
  const cand = {
    sourceKey, fingerprint, categoryId: draft.categoryId,
    nameNorm: nm.norm, nameKey: nm.key,
    latitude: typeof draft.latitude === 'number' ? draft.latitude : null,
    longitude: typeof draft.longitude === 'number' ? draft.longitude : null,
    phoneE164: normalize.phoneE164(draft.phoneNumber, draft.countryCode),
    domain: normalize.domainOf(draft.website || draft.url || draft.sourceUrl),
    geohash7: gh7, geoNeighbors: normalize.geohashNeighbors(gh7),
  };
  const existing = (await store.findCandidates(cand)) || [];
  const verdict = match.classify(cand, existing);

  const listing = toListingDoc(draft, meta);

  if (verdict.kind === 'update') {
    // Incremental: if the matched doc's content fingerprint is unchanged, skip the
    // write entirely (no-op re-sync). Makes weekly heavy re-imports cheap.
    const match = existing.find((e) => e.id === verdict.matchId);
    if (match && match.fingerprint && match.fingerprint === fingerprint) {
      return { decision: 'skip', reason: 'unchanged', matchId: verdict.matchId, meta };
    }
    return { decision: 'update', reason: 'resync', listing, matchId: verdict.matchId, confidence, quality: q, meta };
  }
  if (verdict.kind === 'duplicate') {
    return { decision: 'review', reason: 'duplicate', listing, matchId: verdict.matchId, similarity: verdict.similarity, confidence, quality: q, meta };
  }
  if (verdict.kind === 'uncertain') {
    return { decision: 'review', reason: 'duplicate_uncertain', listing, matchId: verdict.matchId, similarity: verdict.similarity, confidence, quality: q, meta };
  }

  // 7a) TRUSTED DIRECTORY sources (curated open data — OSM/Wikidata): a valid,
  // non-duplicate, non-spam entry with a title + category + location IS a
  // legitimate directory listing, even if sparse (no contact/photo). Publish it
  // — spam is already rejected, duplicates already routed to review, required
  // fields enforced, and sparse entries just rank lower via search quality_score.
  // Requires a resolvable location so we never publish a placeless entry.
  if (source.trustedDirectory && draft.location && String(draft.location).trim().length > 1) {
    return { decision: 'publish', reason: 'trusted_directory', listing, confidence, quality: q, meta };
  }

  // 7b) ROUTE remaining new listings on quality + confidence.
  if (q.score >= cfg.autoPublishQuality && confidence >= cfg.autoPublishConfidence) {
    return { decision: 'publish', reason: 'high_confidence', listing, confidence, quality: q, meta };
  }
  return { decision: 'review', reason: q.score < cfg.autoPublishQuality ? 'low_quality' : 'low_confidence', listing, confidence, quality: q, meta };
}

/**
 * Run a whole batch. `store` must implement:
 *   findCandidates(sig) -> existing[]   (must include {id, sourceKey, title, categoryId})
 *   publish(listing)    -> id           (write to live `listings`)
 *   update(id, listing) -> void
 *   enqueueReview(item) -> id           (write to `listings_staging`)
 *   reject(item)        -> void         (log to failed/rejected)
 * Returns aggregate stats.
 */
async function runBatch(records, source, store, opts = {}) {
  const stats = { total: records.length, published: 0, updated: 0, skipped: 0, review: 0, rejected: 0, byReason: {} };

  // Process one record end-to-end (dedup decision + the resulting store write).
  // Stats mutations are safe under concurrency: JS is single-threaded, so the
  // ++ increments never interleave mid-operation.
  const applyOne = async (raw) => {
    let res;
    try {
      res = await processRecord(raw, source, store, opts);
    } catch (e) {
      stats.rejected++; stats.byReason.error = (stats.byReason.error || 0) + 1;
      await store.reject({ raw, error: e.message, sourceId: source.id });
      return;
    }
    stats.byReason[res.reason] = (stats.byReason[res.reason] || 0) + 1;
    if (res.decision === 'publish') { await store.publish(res.listing); stats.published++; }
    else if (res.decision === 'update') { await store.update(res.matchId, res.listing); stats.updated++; }
    else if (res.decision === 'skip') { stats.skipped++; } // incremental: unchanged, no write
    else if (res.decision === 'review') { await store.enqueueReview(res); stats.review++; }
    else { await store.reject({ raw, reason: res.reason, sourceId: source.id }); stats.rejected++; }
  };

  // opts.concurrency > 1 runs records in fixed-size concurrent chunks. Each
  // record still sees every ALREADY-COMMITTED listing (cross-source dedup vs the
  // existing catalogue is unaffected); only two records WITHIN the same chunk
  // that are mutual duplicates can both slip through (neither sees the other's
  // in-flight write). That rare intra-chunk leak is absorbed by the precision-
  // first review queue + nightly reconciler. Default 1 = original serial path
  // (unchanged for every existing caller).
  const conc = Math.max(1, Number(opts.concurrency) || 1);
  if (conc === 1) {
    for (const raw of records) await applyOne(raw);
  } else {
    for (let i = 0; i < records.length; i += conc) {
      await Promise.all(records.slice(i, i + conc).map(applyOne));
    }
  }
  return stats;
}

module.exports = { processRecord, runBatch, toListingDoc, verifyImages, DEFAULTS };
