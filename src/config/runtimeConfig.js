/**
 * Runtime (backend-driven) marketplace configuration.
 *
 * Holds the live config for every marketplace domain (categories, ranking,
 * homepage sections, nav chips, featured/trending, banners, filters, sort,
 * regions, location, feature flags). The bundled values are the DEFAULT and
 * offline fallback; `applyConfig(raw)` overlays a validated Firestore config.
 *
 * SECURITY: this layer only ever ingests data (numbers/booleans/strings/arrays).
 * It never executes remote code. Algorithms (ranking sort, section rendering)
 * stay in app code; only their parameters/content come from the backend.
 */

import { CATEGORIES, applyCategoryConfig, getVisibleCategories } from './categories';
import { rebuildCategoryMaps } from './categoryMapping';
import { rebuildCategoryI18n } from '../utils/categoryI18n';
import { rebuildImageLimits } from './categoryLimits';

export const CONFIG_SCHEMA_VERSION = 1;

// Deep snapshot of the ORIGINAL bundled taxonomy, captured before any apply, so
// repeated refreshes always merge remote over the pristine bundled base.
const BUNDLED_CATEGORIES = JSON.parse(JSON.stringify(CATEGORIES));

// ---- Bundled defaults (must reproduce today's behavior) ----

const RANKING_DEFAULT = {
  tierWeights: { jobs: 0, directory: 1, importNoPhoto: 2, organicNoPhoto: 3, importPhoto: 4, organicPhoto: 5 },
  jobsLast: true,
  directorySourcePrefixes: ['osm-', 'hipolabs-'],
  roundRobin: { enabled: true, leadMinTier: 2 },
  perCategory: { min: 8, divisor: 12 },
};
const FLAGS_DEFAULT = {
  showJobs: true, showBanners: true, enableTrending: true,
  enableReviews: true, monetizationEnabled: false, showRegionsNav: true,
  homePhotoOnly: true, // front page shows only listings with images (no placeholders)
};
const SECTIONS_DEFAULT = [{ id: 'feed', type: 'feed', enabled: true }];
const LOCATION_DEFAULT = {
  defaultCountry: null, defaultCity: null, askOnLaunch: true, radiusKm: 50, localeMapEnabled: true,
};
const FILTERS_DEFAULT = { priceRanges: [], attributes: [] };
const SORT_DEFAULT = [{ id: 'newest', label: 'Newest', field: 'createdAt', dir: 'desc' }];

// ---- Live state (starts at defaults; overlaid by applyConfig) ----

const state = {
  configVersion: 0,
  flags: { ...FLAGS_DEFAULT },
  ranking: deepClone(RANKING_DEFAULT),
  sections: deepClone(SECTIONS_DEFAULT),
  featuredCategories: [],
  trendingCategories: [],
  banners: [],
  navChips: null,        // null => derive from visible categories
  filters: deepClone(FILTERS_DEFAULT),
  sortOptions: deepClone(SORT_DEFAULT),
  regions: null,         // null => consumers fall back to bundled cityRoutes
  location: { ...LOCATION_DEFAULT },
};

function deepClone(v) { return JSON.parse(JSON.stringify(v)); }
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

// ---- Category merge (remote overrides over bundled, by id) ----

function normalizeSub(s) {
  if (!isObj(s) || !s.id) return null;
  const label = s.label || s.fallback || s.id;
  return { id: s.id, key: s.key || s.id, labelKey: s.labelKey || null, fallback: label, label, icon: s.icon || 'apps' };
}

function mergeCategories(cfg) {
  const base = BUNDLED_CATEGORIES.map((c) => ({
    ...c,
    subCategories: Array.isArray(c.subCategories) ? c.subCategories.map((s) => ({ ...s })) : [],
  }));
  const byId = new Map(base.map((c) => [c.id, c]));
  const overrides = isObj(cfg) && isObj(cfg.overrides) ? cfg.overrides : {};

  for (const [id, ov] of Object.entries(overrides)) {
    if (!isObj(ov)) continue;
    if (byId.has(id)) {
      const c = byId.get(id);
      if (typeof ov.icon === 'string') c.icon = ov.icon;
      if (typeof ov.key === 'string') c.key = ov.key;
      if (ov.hidden != null) c.hidden = !!ov.hidden;
      if (ov.featured != null) c.featured = !!ov.featured;
      // A plain remote label overrides the bundled i18n label (custom labels are
      // not localized — that is expected for an admin-chosen rename).
      if (typeof ov.label === 'string' && ov.label) { c.label = ov.label; c.fallback = ov.label; c.labelKey = null; }
      if (typeof ov.labelKey === 'string') c.labelKey = ov.labelKey;
      if (Array.isArray(ov.subCategories)) c.subCategories = ov.subCategories.map(normalizeSub).filter(Boolean);
    } else {
      // Unknown id => an added category. Requires at least a label.
      const label = ov.label || id;
      const added = {
        id, key: ov.key || label, label, fallback: label, labelKey: ov.labelKey || null,
        icon: ov.icon || 'apps', hidden: !!ov.hidden, featured: !!ov.featured,
        subCategories: Array.isArray(ov.subCategories) ? ov.subCategories.map(normalizeSub).filter(Boolean) : [],
      };
      base.push(added);
      byId.set(id, added);
    }
  }

  const order = isObj(cfg) ? strArr(cfg.order) : [];
  if (order.length) {
    const pos = new Map(order.map((id, i) => [id, i]));
    base.sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : Number.MAX_SAFE_INTEGER;
      const pb = pos.has(b.id) ? pos.get(b.id) : Number.MAX_SAFE_INTEGER;
      return pa - pb; // stable in modern engines: unlisted keep bundled order
    });
  }
  return base;
}

// ---- Validators for non-category domains ----

function validateRanking(r) {
  if (!isObj(r)) return deepClone(RANKING_DEFAULT);
  const tw = isObj(r.tierWeights) ? r.tierWeights : {};
  const d = RANKING_DEFAULT;
  return {
    tierWeights: {
      jobs: num(tw.jobs, d.tierWeights.jobs),
      directory: num(tw.directory, d.tierWeights.directory),
      importNoPhoto: num(tw.importNoPhoto, d.tierWeights.importNoPhoto),
      organicNoPhoto: num(tw.organicNoPhoto, d.tierWeights.organicNoPhoto),
      importPhoto: num(tw.importPhoto, d.tierWeights.importPhoto),
      organicPhoto: num(tw.organicPhoto, d.tierWeights.organicPhoto),
    },
    jobsLast: bool(r.jobsLast, d.jobsLast),
    directorySourcePrefixes: strArr(r.directorySourcePrefixes).length ? strArr(r.directorySourcePrefixes) : d.directorySourcePrefixes,
    roundRobin: {
      enabled: bool(isObj(r.roundRobin) ? r.roundRobin.enabled : undefined, d.roundRobin.enabled),
      leadMinTier: num(isObj(r.roundRobin) ? r.roundRobin.leadMinTier : undefined, d.roundRobin.leadMinTier),
    },
    perCategory: {
      min: Math.max(1, num(isObj(r.perCategory) ? r.perCategory.min : undefined, d.perCategory.min)),
      divisor: Math.max(1, num(isObj(r.perCategory) ? r.perCategory.divisor : undefined, d.perCategory.divisor)),
    },
  };
}

function validateSections(s) {
  if (!Array.isArray(s) || !s.length) return deepClone(SECTIONS_DEFAULT);
  const out = s.filter((x) => isObj(x) && typeof x.type === 'string')
    .map((x) => ({ id: x.id || x.type, type: x.type, title: x.title || null, enabled: x.enabled !== false, params: isObj(x.params) ? x.params : {} }));
  return out.length ? out : deepClone(SECTIONS_DEFAULT);
}

function validateBanners(b) {
  if (!Array.isArray(b)) return [];
  return b.filter((x) => isObj(x) && typeof x.image === 'string' && /^https?:\/\//.test(x.image))
    .map((x) => ({ id: x.id || x.image, image: x.image, link: typeof x.link === 'string' ? x.link : null, title: x.title || '', enabled: x.enabled !== false, order: num(x.order, 0) }))
    .sort((a, z) => a.order - z.order);
}

// ---- Apply ----

/**
 * Apply a raw Firestore config object. Validates + clamps every field; any
 * malformed field falls back to its bundled default. Rebuilds the taxonomy maps
 * in strict order. Returns true if applied, false if ignored (bad schema).
 */
export function applyConfig(raw) {
  if (!isObj(raw)) return false;
  if (raw.schemaVersion != null && Number(raw.schemaVersion) !== CONFIG_SCHEMA_VERSION) {
    // Unknown schema — ignore remote, keep whatever is active (bundled/cached).
    return false;
  }
  try {
    // 1) Categories: merge then mutate-in-place + rebuild derived maps IN ORDER.
    const merged = mergeCategories(raw.categories);
    applyCategoryConfig(merged);
    rebuildCategoryMaps();
    rebuildCategoryI18n();
    rebuildImageLimits(raw.imageLimits);

    // 2) Other domains.
    state.flags = { ...FLAGS_DEFAULT, ...(isObj(raw.featureFlags) ? raw.featureFlags : {}) };
    const home = isObj(raw.home) ? raw.home : {};
    state.ranking = validateRanking(home.ranking);
    state.sections = validateSections(home.sections);
    state.featuredCategories = strArr(home.featuredCategories);
    state.trendingCategories = strArr(home.trendingCategories);
    state.banners = validateBanners(home.banners);
    state.navChips = Array.isArray(raw.navChips) && raw.navChips.length ? strArr(raw.navChips) : null;
    state.filters = isObj(raw.filters) ? { priceRanges: Array.isArray(raw.filters.priceRanges) ? raw.filters.priceRanges : [], attributes: Array.isArray(raw.filters.attributes) ? raw.filters.attributes : [] } : deepClone(FILTERS_DEFAULT);
    state.sortOptions = Array.isArray(raw.sortOptions) && raw.sortOptions.length ? raw.sortOptions.filter((o) => isObj(o) && o.id) : deepClone(SORT_DEFAULT);
    state.regions = isObj(raw.regions) ? raw.regions : null;
    state.location = { ...LOCATION_DEFAULT, ...(isObj(raw.location) ? raw.location : {}) };

    state.configVersion += 1;

    if (typeof __DEV__ !== 'undefined' && __DEV__ && getVisibleCategories().length === 0) {
      console.warn('[runtimeConfig] applied config left zero visible categories');
    }
    return true;
  } catch (e) {
    console.warn('[runtimeConfig] applyConfig failed, keeping current config:', e?.message);
    return false;
  }
}

// ---- Getters (live; default to bundled until applyConfig runs) ----

export const getConfigVersion = () => state.configVersion;
export const getFlags = () => state.flags;
export const getRanking = () => state.ranking;
export const getHomeSections = () => state.sections;
export const getFeaturedCategories = () => state.featuredCategories;
export const getTrendingCategories = () => state.trendingCategories;
export const getBanners = () => state.banners;
export const getFilters = () => state.filters;
export const getSortOptions = () => state.sortOptions;
export const getRegions = () => state.regions;
export const getLocationConfig = () => state.location;

/** Ordered nav-chip ids/keys: remote navChips, else derived from visible cats. */
export function getNavChips() {
  if (state.navChips && state.navChips.length) return state.navChips;
  return ['All', ...getVisibleCategories().map((c) => c.key), '__more__'];
}
