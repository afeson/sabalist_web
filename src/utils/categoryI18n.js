/**
 * Category i18n utilities
 * Derived from the single source of truth in src/config/categories.js.
 *
 * If a translation key is missing from a locale, we fall back to the English
 * label declared in the category config — so adding a new top-level category
 * never produces a raw i18n-key string in the UI.
 */

import { CATEGORIES, getCategoryByKey, LEGACY_CATEGORY_ALIASES } from '../config/categories';

// Canonical key -> i18n translation key
export const CATEGORY_I18N_MAP = {
  All: 'categories.all',
  ...Object.fromEntries(CATEGORIES.map((c) => [c.key, c.labelKey])),
};

// Legacy display names also resolve so old listings render correctly.
for (const [legacyKey, modernKey] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
  if (/[A-Z\s&]/.test(legacyKey) && CATEGORY_I18N_MAP[modernKey] && !CATEGORY_I18N_MAP[legacyKey]) {
    CATEGORY_I18N_MAP[legacyKey] = CATEGORY_I18N_MAP[modernKey];
  }
}

export function getCategoryI18nKey(categoryKey) {
  return CATEGORY_I18N_MAP[categoryKey] || `categories.${categoryKey}`;
}

/**
 * Resolve a category to its localized label.
 * Order of preference:
 *   1. Translation found for the mapped i18n key
 *   2. English `fallback` declared in CATEGORIES
 *   3. The categoryKey itself
 */
export function getTranslatedCategoryLabel(categoryKey, t) {
  if (!categoryKey) return '';
  const i18nKey = CATEGORY_I18N_MAP[categoryKey];
  if (i18nKey) {
    const translated = t(i18nKey);
    // i18next returns the key string when missing; treat that as no-match
    if (translated && translated !== i18nKey) return translated;
  }
  const cat = getCategoryByKey(categoryKey);
  if (cat?.fallback) return cat.fallback;
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
