/**
 * discovery.js — shared listing-discovery engine (platform-agnostic).
 *
 * This module holds ALL the real-data discovery logic that used to live inline
 * in searchListings(): backend-driven ranking (getRanking / getFlags),
 * featured/promoted/newest/popular mixing, geographic fallback FILL
 * (City → Region/State → Country → Global), dedup, in-memory pagination, and a
 * short-TTL cache (in-memory + AsyncStorage). It is imported by BOTH
 * services/listings.js (native) and services/listings.web.js (web) so the two
 * platform files stay in lock-step — the platform files only provide a
 * `fetchPool()` that runs the Firestore query, and this module does the rest.
 *
 * NO mock/placeholder data ever originates here — every listing comes from the
 * Firestore pool passed in by the caller.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRanking, getFlags } from '../config/runtimeConfig';

// Page size served to the UI per scroll. The Firestore pool is much larger than
// this (see PAGE_SIZE * many); we page through it in-memory so scrolling is free.
export const PAGE_SIZE = 24;

// Short-TTL cache so revisits + pagination are instant. Invalidated on
// pull-to-refresh (see clearDiscoveryCache).
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = '@sabalist:discovery:';
const memCache = new Map(); // key -> { ts, listings }

function cacheKey({ searchText, category, subcategoryId, minPrice, maxPrice, userLocation }) {
  const loc = userLocation
    ? `${userLocation.city || ''}|${userLocation.state || ''}|${userLocation.country || ''}`
    : '';
  return [
    (searchText || '').trim().toLowerCase(),
    category || 'all',
    subcategoryId || '',
    minPrice ?? '',
    maxPrice ?? '',
    loc,
  ].join('::');
}

async function readCache(key) {
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) return mem.listings;
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS && Array.isArray(parsed.listings)) {
        memCache.set(key, parsed);
        return parsed.listings;
      }
    }
  } catch (_) {}
  return null;
}

async function writeCache(key, listings) {
  const entry = { ts: Date.now(), listings };
  memCache.set(key, entry);
  try { await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry)); } catch (_) {}
}

/** Wipe the whole discovery cache (used on pull-to-refresh). */
export async function clearDiscoveryCache() {
  memCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = (keys || []).filter((k) => k.startsWith(CACHE_PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch (_) {}
}

// ---- Locality helpers (substring match against the free-text `location`) ----

const lc = (v) => (v || '').toString().toLowerCase();

/**
 * Returns the tightest geographic level at which a listing matches the user's
 * location: 'city' > 'region' > 'country' > 'global'. Because `location` is a
 * free-text string like "Lagos, Nigeria", matching is substring based and also
 * checks the optional structured `country`/`region`/`state` fields when present.
 */
function localityLevel(listing, uc, us, uco) {
  const loc = lc(listing.location);
  const lCountry = lc(listing.country);
  const lRegion = lc(listing.region) || lc(listing.state);
  if (uc && loc && loc.includes(uc)) return 'city';
  if (us && ((loc && loc.includes(us)) || (lRegion && lRegion.includes(us)))) return 'region';
  if (uco && ((loc && loc.includes(uco)) || (lCountry && lCountry.includes(uco)))) return 'country';
  return 'global';
}

const LEVEL_RANK = { city: 3, region: 2, country: 1, global: 0 };

// ---- Ranking (backend-driven tier weights + featured/promoted/popularity) ----

function buildTierFn(rank) {
  const tw = rank.tierWeights;
  const isDir = (s) => rank.directorySourcePrefixes.some((p) => (s || '').startsWith(p));
  return (l) => {
    if (rank.jobsLast && l.categoryId === 'jobs') return tw.jobs;
    if (isDir(l.source)) return tw.directory;
    if (!l.source && l.hasImage) return tw.organicPhoto;
    if (l.source && l.hasImage) return tw.importPhoto;
    if (!l.source) return tw.organicNoPhoto;
    return tw.importNoPhoto;
  };
}

const createdMs = (l) => {
  const c = l.createdAt;
  if (!c) return 0;
  if (typeof c === 'number') return c;
  if (typeof c === 'string') { const t = Date.parse(c); return Number.isNaN(t) ? 0 : t; }
  if (typeof c.toMillis === 'function') { try { return c.toMillis(); } catch (_) { return 0; } }
  if (typeof c.seconds === 'number') return c.seconds * 1000;
  return 0;
};
const viewsOf = (l) => Number(l.views) || 0;

/**
 * Round-robin by category so one large import can't dominate. Preserves the
 * incoming order within each category bucket.
 */
function roundRobinByCategory(arr) {
  const m = new Map();
  for (const l of arr) {
    const k = l.categoryId || 'other';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(l);
  }
  const buckets = [...m.values()];
  const out = [];
  let any = true;
  while (any) {
    any = false;
    for (const b of buckets) { if (b.length) { out.push(b.shift()); any = true; } }
  }
  return out;
}

/**
 * Dedup by id, preserving first-seen order.
 */
function dedupById(arr) {
  const seen = new Set();
  const out = [];
  for (const l of arr) {
    if (!l || !l.id || seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
  }
  return out;
}

/**
 * Rank a raw Firestore pool into the final ordered feed.
 *
 * Requirements implemented here:
 *  - #1  pool is global (caller does not hard-filter by location)
 *  - #3/#9 geographic fallback FILL: city block first, then region, country,
 *          global — so the top of the feed is local but the page always fills
 *          from the wider pool.
 *  - #4  dedup by id
 *  - #5  featured/promoted boosted; newest & popular (views) interleaved within
 *        each tier so no single signal dominates.
 *  - #8  featured/promoted/newest/popular are mixed WITHOUT repeats (dedup).
 *  - #10 logs how many listings matched at city/region/country/global.
 *
 * @param {Array} pool         raw listings from Firestore (already active)
 * @param {Object} opts        { userLocation, isHomeFeed }
 * @returns {Array} ranked, de-duplicated listings
 */
export function rankPool(pool, { userLocation = null, isHomeFeed = false } = {}) {
  const rank = getRanking();
  const tierOf = buildTierFn(rank);

  const uc = lc(userLocation && userLocation.city);
  const us = lc(userLocation && userLocation.state);
  const uco = lc(userLocation && userLocation.country);

  let items = dedupById(pool);

  // ---- #10: geographic fallback level counts (city → region → country → global)
  const byLevel = { city: [], region: [], country: [], global: [] };
  for (const l of items) byLevel[localityLevel(l, uc, us, uco)].push(l);
  console.log(
    `📍 Geo fallback levels — city: ${byLevel.city.length}, region: ${byLevel.region.length}, ` +
    `country: ${byLevel.country.length}, global: ${byLevel.global.length} (total ${items.length})`
  );

  // Featured/promoted flags (boolean-ish, tolerate missing fields).
  const isFeatured = (l) => l.featured === true || l.promoted === true;

  // Score inside a locality block: featured/promoted first, then higher tier,
  // then interleave newest & popular so neither dominates. We alternate the
  // primary sort key by index parity after a stable multi-key sort: sort by a
  // blended key (tier desc, featured desc) then zip newest-ordered and
  // popular-ordered lists together.
  const orderBlock = (block) => {
    if (!block.length) return block;
    // Primary partition: featured/promoted always lead their block.
    const feat = block.filter(isFeatured);
    const rest = block.filter((l) => !isFeatured(l));
    const zipNewestPopular = (arr) => {
      // Two orderings of the SAME set, then interleave (dedup keeps it clean).
      const byTierNewest = [...arr].sort((a, b) => {
        const t = tierOf(b) - tierOf(a); if (t) return t;
        return createdMs(b) - createdMs(a);
      });
      const byTierPopular = [...arr].sort((a, b) => {
        const t = tierOf(b) - tierOf(a); if (t) return t;
        return viewsOf(b) - viewsOf(a);
      });
      const mixed = [];
      const n = Math.max(byTierNewest.length, byTierPopular.length);
      for (let i = 0; i < n; i++) {
        if (i < byTierNewest.length) mixed.push(byTierNewest[i]);
        if (i < byTierPopular.length) mixed.push(byTierPopular[i]);
      }
      return dedupById(mixed);
    };
    return [...zipNewestPopular(feat), ...zipNewestPopular(rest)];
  };

  // ---- #3/#9: fill in locality order, each block internally ranked/mixed.
  let ordered = [
    ...orderBlock(byLevel.city),
    ...orderBlock(byLevel.region),
    ...orderBlock(byLevel.country),
    ...orderBlock(byLevel.global),
  ];
  ordered = dedupById(ordered);

  // Home feed only: round-robin by category so one big import can't dominate.
  // Lead tier stays on top; trailing (jobs/directory) stays last — same policy
  // as before, but now applied per locality-preserving order.
  if (isHomeFeed && rank.roundRobin.enabled) {
    const leadMin = rank.roundRobin.leadMinTier;
    const lead = ordered.filter((l) => tierOf(l) >= leadMin);
    const trail = ordered.filter((l) => tierOf(l) < leadMin);
    ordered = dedupById([...roundRobinByCategory(lead), ...roundRobinByCategory(trail)]);
  }

  return ordered;
}

/**
 * Discovery entrypoint. Fetches (or reuses cached) the FULL ranked pool for a
 * query, then returns the requested in-memory page.
 *
 * @param {Function} fetchPool  async () => Array — platform Firestore fetch
 * @param {Object}   params     { searchText, category, subcategoryId, minPrice,
 *                                maxPrice, userLocation, applyFilters }
 *   - applyFilters: (listings) => listings  — platform subcategory/price filter
 * @param {Object}   page       { page = 0, pageSize = PAGE_SIZE, forceRefresh }
 * @returns {Promise<{ items, page, pageSize, total, hasMore }>}
 */
export async function discover(fetchPool, params, page = {}) {
  const { userLocation = null, applyFilters } = params;
  const isHomeFeed =
    !(params.searchText || '').trim() && !params.category && !params.subcategoryId;
  const pageNum = Math.max(0, page.page || 0);
  const pageSize = page.pageSize || PAGE_SIZE;
  const key = cacheKey(params);

  let ranked = page.forceRefresh ? null : await readCache(key);

  if (!ranked) {
    // Real Firestore fetch — global pool (all countries), never mocked.
    let pool = await fetchPool();
    // Active-only guard (defensive; platform fetch already filters).
    pool = (pool || []).filter((l) => l && (l.status === 'active' || !l.status));
    // Platform-specific subcategory + price filters run BEFORE ranking so the
    // pool the user pages through already matches their filters.
    if (typeof applyFilters === 'function') pool = applyFilters(pool);

    // Home front-page: pictures only (respects homePhotoOnly flag), same as before.
    if (isHomeFeed && getFlags().homePhotoOnly !== false) {
      pool = pool.filter((l) => !!(l.coverImage || (l.images && l.images.length) || l.hasImage));
    }

    ranked = rankPool(pool, { userLocation, isHomeFeed });
    await writeCache(key, ranked);
  }

  // Text search is applied AFTER ranking (matches previous behavior: rank first,
  // then narrow). Substring across title/description/category/location.
  let result = ranked;
  const q = (params.searchText || '').trim().toLowerCase();
  if (q) {
    result = ranked.filter((l) =>
      lc(l.title).includes(q) ||
      lc(l.description).includes(q) ||
      lc(l.category).includes(q) ||
      lc(l.location).includes(q)
    );
  }

  const total = result.length;
  const start = pageNum * pageSize;
  const items = result.slice(start, start + pageSize);
  const hasMore = start + pageSize < total;
  return { items, page: pageNum, pageSize, total, hasMore };
}
