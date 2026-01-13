/**
 * Category ID Mapping
 * Maps display names to stable IDs for Firestore queries
 */

export const CATEGORY_ID_MAP = {
  'Electronics': 'electronics',
  'Vehicles': 'vehicles',
  'Furniture': 'furniture',
  'Home Appliances': 'home-appliances',
  'Construction Equipment': 'construction-equipment',
  'Art & Collectibles': 'art-collectibles',
  'Fashion': 'fashion',
  'Services': 'services',
  'Jobs': 'jobs',
  'Real Estate': 'real-estate',
};

export const CATEGORY_NAME_MAP = {
  'electronics': 'Electronics',
  'vehicles': 'Vehicles',
  'furniture': 'Furniture',
  'home-appliances': 'Home Appliances',
  'construction-equipment': 'Construction Equipment',
  'art-collectibles': 'Art & Collectibles',
  'fashion': 'Fashion',
  'services': 'Services',
  'jobs': 'Jobs',
  'real-estate': 'Real Estate',
};

export function getCategoryId(categoryName) {
  return CATEGORY_ID_MAP[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');
}

export function getCategoryName(categoryId) {
  return CATEGORY_NAME_MAP[categoryId] || categoryId;
}
