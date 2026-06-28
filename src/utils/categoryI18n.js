/**
 * Category i18n utilities
 * Derived from the single source of truth in src/config/categories.js.
 *
 * If a translation key is missing from a locale, we fall back to the English
 * label declared in the category config — so adding a new top-level category
 * never produces a raw i18n-key string in the UI.
 */

import { CATEGORIES, getCategoryByKey, LEGACY_CATEGORY_ALIASES } from '../config/categories';

// Canonical key -> i18n translation key. Mutated IN PLACE by
// rebuildCategoryI18n() (never reassigned) so the runtime config layer can swap
// the taxonomy at startup without invalidating this exported reference.
export const CATEGORY_I18N_MAP = {};

/** (Re)build CATEGORY_I18N_MAP from the current CATEGORIES + legacy aliases. */
export function rebuildCategoryI18n() {
  for (const k of Object.keys(CATEGORY_I18N_MAP)) delete CATEGORY_I18N_MAP[k];
  CATEGORY_I18N_MAP.All = 'categories.all';
  for (const c of CATEGORIES) {
    if (c.labelKey) CATEGORY_I18N_MAP[c.key] = c.labelKey;
  }
  for (const [legacyKey, modernKey] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
    if (/[A-Z\s&]/.test(legacyKey) && CATEGORY_I18N_MAP[modernKey] && !CATEGORY_I18N_MAP[legacyKey]) {
      CATEGORY_I18N_MAP[legacyKey] = CATEGORY_I18N_MAP[modernKey];
    }
  }
}

// Build once at module load (bundled defaults).
rebuildCategoryI18n();

export function getCategoryI18nKey(categoryKey) {
  return CATEGORY_I18N_MAP[categoryKey] || `categories.${categoryKey}`;
}

/**
 * Resolve a category to its localized label.
 * Order of preference:
 *   1. Translation found for the mapped i18n key
 *   2. English `fallback` declared in CATEGORIES
 *   3. A plain `fallbackLabel` (e.g. a label from a Firestore-defined category
 *      that has no i18n key)
 *   4. The categoryKey itself
 */
export function getTranslatedCategoryLabel(categoryKey, t, fallbackLabel = null) {
  if (!categoryKey) return '';
  const i18nKey = CATEGORY_I18N_MAP[categoryKey];
  if (i18nKey) {
    const translated = t(i18nKey);
    // i18next returns the key string when missing; treat that as no-match
    if (translated && translated !== i18nKey) return translated;
  }
  const cat = getCategoryByKey(categoryKey);
  if (cat?.fallback) return cat.fallback;
  if (fallbackLabel) return fallbackLabel;
  return categoryKey;
}

/**
 * Resolve a subcategory item to its localized label.
 * `subCat` is the object from CATEGORIES[i].subCategories.
 */
export function getTranslatedSubCategoryLabel(subCat, t) {
  if (!subCat) return '';
  if (subCat.labelKey) {
    const translated = t(subCat.labelKey);
    if (translated && translated !== subCat.labelKey) return translated;
  }
  return subCat.fallback || subCat.id;
}
