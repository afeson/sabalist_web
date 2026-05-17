/**
 * Category ID Mapping
 * Derived from the single source of truth in src/config/categories.js.
 * Maps display names <-> stable slugs used in Firestore queries and SEO URLs.
 *
 * Legacy keys/ids (e.g. 'Furniture', 'home-appliances') are preserved so
 * that old listings keep resolving — they simply point to their new home.
 */

import { CATEGORIES, LEGACY_CATEGORY_ALIASES, resolveCategoryKey, resolveCategoryId } from './categories';

// Canonical key -> id, e.g. 'Electronics' -> 'electronics'
export const CATEGORY_ID_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.id])
);

// Canonical id -> key, e.g. 'electronics' -> 'Electronics'
export const CATEGORY_NAME_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.key])
);

// Also resolve legacy display-name aliases to a slug so callers that hold
// old category names (e.g. listings created before the redesign) still work.
for (const [legacyKey, modernKey] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
  // Only display-name aliases (have spaces or uppercase)
  if (/[A-Z\s&]/.test(legacyKey)) {
    const modernId = CATEGORY_ID_MAP[modernKey];
    if (modernId && !CATEGORY_ID_MAP[legacyKey]) {
      CATEGORY_ID_MAP[legacyKey] = modernId;
    }
  } else {
    // slug alias — point old slug at the modern display name
    const modernName = CATEGORY_NAME_MAP[modernKey];
    if (modernName && !CATEGORY_NAME_MAP[legacyKey]) {
      CATEGORY_NAME_MAP[legacyKey] = modernName;
    }
  }
}

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
