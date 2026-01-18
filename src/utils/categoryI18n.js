/**
 * Category i18n utilities
 * Maps category keys to translation keys for consistent internationalization
 */

// Map category keys (stored in DB) to i18n translation keys
export const CATEGORY_I18N_MAP = {
  'All': 'categories.all',
  'Electronics': 'categories.electronics',
  'Vehicles': 'categories.vehicles',
  'Furniture': 'categories.furniture',
  'Home Appliances': 'categories.homeAppliances',
  'Construction Equipment': 'categories.constructionEquipment',
  'Art & Collectibles': 'categories.artCollectibles',
  'Fashion': 'categories.fashion',
  'Services': 'categories.services',
  'Jobs': 'categories.jobs',
  'Real Estate': 'categories.realEstate',
};

/**
 * Get the i18n translation key for a category
 * @param {string} categoryKey - The category key (e.g., 'Electronics', 'Real Estate')
 * @returns {string} The i18n key (e.g., 'categories.electronics')
 */
export function getCategoryI18nKey(categoryKey) {
  return CATEGORY_I18N_MAP[categoryKey] || `categories.${categoryKey}`;
}

/**
 * Get the translated category label using a translation function
 * @param {string} categoryKey - The category key
 * @param {function} t - The translation function from useTranslation()
 * @returns {string} The translated category label
 */
export function getTranslatedCategoryLabel(categoryKey, t) {
  const i18nKey = CATEGORY_I18N_MAP[categoryKey];
  if (i18nKey) {
    return t(i18nKey);
  }
  // Fallback to the category key itself
  return categoryKey;
}
