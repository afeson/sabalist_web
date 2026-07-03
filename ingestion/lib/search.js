'use strict';
/**
 * Typesense search-index integration (Phase 1).
 *
 * The search index is a DISPOSABLE PROJECTION of Firestore (source of truth):
 * every ingestion write is mirrored here, and it can be fully rebuilt at any time
 * from Firestore / BigQuery. Serving reads (seo-web city/category/search) hit this
 * index instead of scanning Firestore.
 *
 * Fully ENV-GATED and safe: if TYPESENSE_URL / TYPESENSE_ADMIN_KEY are unset (or
 * the `typesense` package isn't installed), every write no-ops and returns false —
 * so wiring this into the ingestion store changes nothing until an endpoint exists.
 *
 * Env: TYPESENSE_URL (e.g. https://search.sabalist.com) + TYPESENSE_ADMIN_KEY.
 *
 * The pure functions (toSearchDoc, qualityScore, SCHEMA) are unit-testable with no
 * client, no network, no config.
 */

const COLLECTION = 'listings';

// Typesense collection schema. quality_score is the default numeric ranking tie-break.
const SCHEMA = {
  name: COLLECTION,
  enable_nested_fields: false,
  default_sorting_field: 'quality_score',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'sellerName', type: 'string', optional: true },
    { name: 'categoryId', type: 'string', facet: true, optional: true },
    { name: 'category', type: 'string', facet: true, optional: true },
    { name: 'subcategory', type: 'string', facet: true, optional: true },
    { name: 'country', type: 'string', facet: true, optional: true },
    { name: 'city', type: 'string', facet: true, optional: true },
    { name: 'location', type: 'string', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'claimable', type: 'bool', facet: true, optional: true },
    { name: 'verified', type: 'bool', facet: true, optional: true },
    { name: 'aiEnriched', type: 'bool', optional: true },
    { name: 'hasImage', type: 'bool', facet: true, optional: true },
    { name: 'hasContact', type: 'bool', facet: true, optional: true },
    { name: 'location_geo', type: 'geopoint', optional: true },
    { name: 'quality_score', type: 'int32' },
    { name: 'createdAt', type: 'int64', optional: true },
    { name: 'updatedAt', type: 'int64', optional: true },
  ],
};

const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

function hasContact(l) {
  return nonEmpty(l.phoneNumber) || nonEmpty(l.whatsapp) || nonEmpty(l.website)
      || nonEmpty(l.email) || nonEmpty(l.sourceUrl) || nonEmpty(l.url);
}
function hasImage(l) {
  return !!(l.coverImage || l.hasImage || (Array.isArray(l.images) && l.images.length));
}

/** Deterministic ranking signal, precomputed at index time (0..100). */
function qualityScore(l) {
  let s = 0;
  if (l.businessVerified === true || (l.userId && l.userId !== 'imported-listings' && l.userId !== 'ai-assistant')) s += 40;
  if (hasImage(l)) s += 25;
  if (hasContact(l)) s += 20;
  if (l.aiEnriched === true) s += 10;
  const dlen = (l.description || '').length;
  s += Math.min(5, Math.floor(dlen / 120)); // 0..5 by description richness
  return s;
}

const toUnix = (v) => {
  if (typeof v === 'number') return Math.floor(v > 1e12 ? v / 1000 : v);
  if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : Math.floor(t / 1000); }
  if (v && typeof v.toDate === 'function') { try { return Math.floor(v.toDate().getTime() / 1000); } catch { return 0; } }
  return 0;
};

/** Map a Firestore listing (+id) to a Typesense document. */
function toSearchDoc(id, l) {
  const doc = {
    id: String(id),
    title: l.title || '',
    description: (l.description || '').slice(0, 1000), // full text stays in Firestore
    sellerName: l.sellerName || '',
    categoryId: l.categoryId || '',
    category: l.category || '',
    subcategory: l.subcategory || '',
    country: l.country || '',
    city: l.city || '',
    location: l.location || '',
    status: l.status || 'active',
    claimable: l.claimable === true,
    verified: l.businessVerified === true,
    aiEnriched: l.aiEnriched === true,
    hasImage: hasImage(l),
    hasContact: hasContact(l),
    quality_score: qualityScore(l),
    createdAt: toUnix(l.createdAt),
    updatedAt: toUnix(l.updatedAt),
  };
  if (typeof l.latitude === 'number' && typeof l.longitude === 'number') {
    doc.location_geo = [l.latitude, l.longitude];
  }
  return doc;
}

// ---- Client (lazy, env-gated) ----------------------------------------------
let _client = null;
let _init = false;

function config() {
  const url = (process.env.TYPESENSE_URL || '').trim();
  const key = (process.env.TYPESENSE_ADMIN_KEY || '').trim();
  if (!url || !key) return null;
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || (u.protocol === 'https:' ? 443 : 80)), protocol: u.protocol.replace(':', ''), key };
  } catch { return null; }
}

function isEnabled() { return !!config(); }

function client() {
  if (_init) return _client;
  _init = true;
  const cfg = config();
  if (!cfg) return (_client = null);
  let Typesense;
  try { Typesense = require('typesense'); }
  catch { console.warn('search: `typesense` package not installed — index sync disabled.'); return (_client = null); }
  _client = new Typesense.Client({
    nodes: [{ host: cfg.host, port: cfg.port, protocol: cfg.protocol }],
    apiKey: cfg.key,
    connectionTimeoutSeconds: 5,
    numRetries: 2,
  });
  return _client;
}

/** Create the collection if missing. Safe to call repeatedly. */
async function ensureCollection() {
  const c = client();
  if (!c) return false;
  try { await c.collections(COLLECTION).retrieve(); return true; }
  catch { try { await c.collections().create(SCHEMA); return true; } catch (e) { console.warn('search: ensureCollection failed:', e.message); return false; } }
}

async function upsertListing(id, listing) {
  const c = client();
  if (!c) return false;
  try { await c.collections(COLLECTION).documents().upsert(toSearchDoc(id, listing)); return true; }
  catch (e) { console.warn('search: upsert failed:', e.message); return false; }
}

async function removeListing(id) {
  const c = client();
  if (!c) return false;
  try { await c.collections(COLLECTION).documents(String(id)).delete(); return true; }
  catch (e) { return false; } // already gone is fine
}

/** Bulk import (initial load / reconcile). docs = [{id, ...listing}]. */
async function bulkImport(rows) {
  const c = client();
  if (!c || !rows.length) return { ok: 0, failed: 0 };
  const docs = rows.map((r) => toSearchDoc(r.id, r));
  try {
    const res = await c.collections(COLLECTION).documents().import(docs, { action: 'upsert' });
    const failed = res.filter((r) => r.success === false).length;
    return { ok: docs.length - failed, failed };
  } catch (e) { console.warn('search: bulkImport failed:', e.message); return { ok: 0, failed: docs.length }; }
}

module.exports = {
  COLLECTION, SCHEMA, toSearchDoc, qualityScore, hasContact, hasImage,
  isEnabled, ensureCollection, upsertListing, removeListing, bulkImport,
};
