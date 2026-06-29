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
    location: draft.location || [draft.city, draft.country].filter(Boolean).join(', '),
    language: draft.language || 'en',
    phoneNumber: draft.phoneNumber || '',
    images: draft.images || [],
    coverImage: draft.coverImage || (draft.images || [])[0] || '',
    hasImage: !!(draft.coverImage || (draft.images && draft.images.length)),
    status: 'active',
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
  const meta = { sourceId: source.id, sourceKey, fingerprint, ownerUserId: source.ownerUserId, now, qualityScore: q.score };

  // Hard rejects.
  if (q.isSpam) return { decision: 'reject', reason: 'spam', meta, issues: q.issues };
  if (!draft.title || !draft.categoryId) {
    return { decision: 'review', reason: 'missing_required', listing: toListingDoc(draft, meta), confidence, quality: q, meta };
  }

  // 6) DEDUP
  const existing = (await store.findCandidates({ sourceKey, fingerprint, categoryId: draft.categoryId, title: draft.title })) || [];
  const verdict = dedup.classify({ sourceKey, title: draft.title, categoryId: draft.categoryId, amount: draft.amount, city: draft.city, location: draft.location }, existing);

  const listing = toListingDoc(draft, meta);

  if (verdict.kind === 'update') {
    return { decision: 'update', reason: 'resync', listing, matchId: verdict.matchId, confidence, quality: q, meta };
  }
  if (verdict.kind === 'duplicate') {
    return { decision: 'review', reason: 'duplicate', listing, matchId: verdict.matchId, similarity: verdict.similarity, confidence, quality: q, meta };
  }
  if (verdict.kind === 'uncertain') {
    return { decision: 'review', reason: 'duplicate_uncertain', listing, matchId: verdict.matchId, similarity: verdict.similarity, confidence, quality: q, meta };
  }

  // 7) ROUTE new listings on quality + confidence.
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
  const stats = { total: records.length, published: 0, updated: 0, review: 0, rejected: 0, byReason: {} };
  for (const raw of records) {
    let res;
    try {
      res = await processRecord(raw, source, store, opts);
    } catch (e) {
      stats.rejected++; stats.byReason.error = (stats.byReason.error || 0) + 1;
      await store.reject({ raw, error: e.message, sourceId: source.id });
      continue;
    }
    stats.byReason[res.reason] = (stats.byReason[res.reason] || 0) + 1;
    if (res.decision === 'publish') { await store.publish(res.listing); stats.published++; }
    else if (res.decision === 'update') { await store.update(res.matchId, res.listing); stats.updated++; }
    else if (res.decision === 'review') { await store.enqueueReview(res); stats.review++; }
    else { await store.reject({ raw, reason: res.reason, sourceId: source.id }); stats.rejected++; }
  }
  return stats;
}

module.exports = { processRecord, runBatch, toListingDoc, verifyImages, DEFAULTS };
