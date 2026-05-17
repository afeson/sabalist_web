// Category-based image limits.
// Categories listed here override the default. Aliased legacy categories
// resolve via canonicalCategoryName before lookup.

import { canonicalCategoryName } from './categoryMapping';

export const CATEGORY_IMAGE_LIMITS = {
  'Vehicles': {
    min: 3,
    max: 30,
    description: 'Cars, motorcycles, trucks — show all angles',
  },
  'Real Estate': {
    min: 3,
    max: 25,
    description: 'Properties — interior, exterior, amenities',
  },
  'Electronics': {
    min: 3,
    max: 10,
    description: 'TVs, cameras, gadgets',
  },
  'Phones & Tablets': {
    min: 3,
    max: 10,
    description: 'Phones, tablets, accessories',
  },
  'Computers': {
    min: 3,
    max: 10,
    description: 'Laptops, desktops, components',
  },
  'Fashion': {
    min: 3,
    max: 8,
    description: 'Clothing, shoes, accessories',
  },
  'Beauty': {
    min: 1,
    max: 8,
    description: 'Beauty products',
  },
  'Home & Furniture': {
    min: 3,
    max: 15,
    description: 'Furniture, appliances, decor',
  },
  'Jobs': {
    min: 1,
    max: 5,
    description: 'Job postings',
  },
  'Services': {
    min: 1,
    max: 5,
    description: 'Service offerings',
  },
  'Repair Services': {
    min: 1,
    max: 5,
    description: 'Repair offerings',
  },
  'Rentals': {
    min: 3,
    max: 15,
    description: 'Items for rent',
  },
  'Food': {
    min: 1,
    max: 10,
    description: 'Food and beverages',
  },
  'Agriculture': {
    min: 1,
    max: 10,
    description: 'Crops, seeds, farm goods',
  },
  'Animals & Pets': {
    min: 1,
    max: 10,
    description: 'Pets and animals',
  },
  'Baby & Kids': {
    min: 1,
    max: 8,
    description: 'Baby and kids items',
  },
  'Sports & Fitness': {
    min: 1,
    max: 10,
    description: 'Sports gear',
  },
  'Business & Industrial': {
    min: 1,
    max: 15,
    description: 'B2B and industrial items',
  },
  'Events & Tickets': {
    min: 1,
    max: 5,
    description: 'Event details',
  },
  'Education': {
    min: 1,
    max: 8,
    description: 'Books and learning materials',
  },
  'Travel': {
    min: 1,
    max: 10,
    description: 'Travel-related listings',
  },
  'Construction': {
    min: 1,
    max: 15,
    description: 'Construction equipment and materials',
  },
  'Entertainment': {
    min: 1,
    max: 10,
    description: 'Media, art, instruments',
  },
  'Community': {
    min: 0,
    max: 5,
    description: 'Community posts',
  },
  'Other': {
    min: 1,
    max: 10,
    description: 'Miscellaneous',
  },
};

// Default limits for unlisted categories
export const DEFAULT_IMAGE_LIMITS = {
  min: 1,
  max: 15,
};

// Global constraints
export const GLOBAL_IMAGE_LIMITS = {
  absoluteMax: 30,
  absoluteMin: 0, // Community posts may have no images
  maxFileSize: 10 * 1024 * 1024, // 10MB per image
  compressionWidth: 1600,
  compressionQuality: 0.75,
};

/**
 * Get image limits for a category (accepts legacy category names).
 */
export function getImageLimits(category) {
  const canonical = canonicalCategoryName(category);
  return CATEGORY_IMAGE_LIMITS[canonical] || CATEGORY_IMAGE_LIMITS[category] || DEFAULT_IMAGE_LIMITS;
}

/**
 * Validate image count for category.
 */
export function validateImageCount(count, category) {
  const limits = getImageLimits(category);

  if (count < limits.min) {
    return {
      valid: false,
      message: `${category} listings require at least ${limits.min} images`,
    };
  }

  if (count > limits.max) {
    return {
      valid: false,
      message: `${category} listings can have maximum ${limits.max} images`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Check if file size is valid.
 */
export function isValidFileSize(size) {
  return size <= GLOBAL_IMAGE_LIMITS.maxFileSize;
}
