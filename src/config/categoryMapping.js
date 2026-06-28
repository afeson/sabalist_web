/**
 * Category ID Mapping
 * Derived from the single source of truth in src/config/categories.js.
 * Maps display names <-> stable slugs used in Firestore queries and SEO URLs.
 *
 * Legacy keys/ids (e.g. 'Furniture', 'home-appliances') are preserved so
 * that old listings keep resolving — they simply point to their new home.
 */

import { CATEGORIES, LEGACY_CATEGORY_ALIASES, resolveCategoryKey, resolveCategoryId } from './categories';

// Canonical key <-> id maps. Mutated IN PLACE by rebuildCategoryMaps() (never
// reassigned) so the runtime config layer can swap the taxonomy at startup
// without invalidating these exported references.
export const CATEGORY_ID_MAP = {};
export const CATEGORY_NAME_MAP = {};

/**
 * (Re)build CATEGORY_ID_MAP / CATEGORY_NAME_MAP from the current CATEGORIES,
 * then overlay legacy aliases. Clears + refills in place. Legacy entries are
 * never removed, so old listings keep resolving even if a category is hidden
 * or relabeled.
 */
export function rebuildCategoryMaps() {
  for (const k of Object.keys(CATEGORY_ID_MAP)) delete CATEGORY_ID_MAP[k];
  for (const k of Object.keys(CATEGORY_NAME_MAP)) delete CATEGORY_NAME_MAP[k];
  for (const c of CATEGORIES) {
    CATEGORY_ID_MAP[c.key] = c.id;   // 'Electronics' -> 'electronics'
    CATEGORY_NAME_MAP[c.id] = c.key; // 'electronics' -> 'Electronics'
  }
  // Resolve legacy aliases so callers holding old category names/slugs still work.
  for (const [legacyKey, modernKey] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
    if (/[A-Z\s&]/.test(legacyKey)) {
      const modernId = CATEGORY_ID_MAP[modernKey];
      if (modernId && !CATEGORY_ID_MAP[legacyKey]) CATEGORY_ID_MAP[legacyKey] = modernId;
    } else {
      const modernName = CATEGORY_NAME_MAP[modernKey];
      if (modernName && !CATEGORY_NAME_MAP[legacyKey]) CATEGORY_NAME_MAP[legacyKey] = modernName;
    }
  }
}

// Build once at module load (bundled defaults).
rebuildCategoryMaps();

export function getCategoryId(categoryName) {
  if (!categoryName) return categoryName;
  const direct = CATEGORY_ID_MAP[categoryName];
  if (direct) return direct;
  // Fall back: kebab-case the input so unknown categories at least produce
  // a deterministic slug.
  return categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
}

export function getCategoryName(categoryId) {
  if (!categoryId) return categoryId;
  return CATEGORY_NAME_MAP[categoryId] || CATEGORY_NAME_MAP[resolveCategoryId(categoryId)] || categoryId;
}

/** Canonicalize a possibly-legacy display name to its modern form. */
export function canonicalCategoryName(name) {
  return resolveCategoryKey(name) || name;
}

/** Canonicalize a possibly-legacy slug to its modern form. */
export function canonicalCategoryId(id) {
  return resolveCategoryId(id) || id;
}
