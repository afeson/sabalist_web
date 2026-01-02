// Category-based image limits for power sellers
export const CATEGORY_IMAGE_LIMITS = {
  'Vehicles': {
    min: 3,
    max: 30,
    description: 'Cars, motorcycles, trucks - show all angles',
  },
  'Real Estate': {
    min: 3,
    max: 25,
    description: 'Properties - interior, exterior, amenities',
  },
  'Electronics': {
    min: 3,
    max: 10,
    description: 'Phones, laptops, gadgets',
  },
  'Fashion': {
    min: 3,
    max: 8,
    description: 'Clothing, shoes, accessories',
  },
  'Services': {
    min: 1,
    max: 5,
    description: 'Service offerings',
  },
};

// Default limits for unlisted categories
export const DEFAULT_IMAGE_LIMITS = {
  min: 3,
  max: 15,
};

// Global constraints
export const GLOBAL_IMAGE_LIMITS = {
  absoluteMax: 30,
  absoluteMin: 1, // Services can have 1
  maxFileSize: 10 * 1024 * 1024, // 10MB per image
  compressionWidth: 1600, // Max width for compression
  compressionQuality: 0.75, // 75% quality
};

/**
 * Get image limits for a category
 * @param {string} category - Category name
 * @returns {Object} { min, max, description }
 */
export function getImageLimits(category) {
  return CATEGORY_IMAGE_LIMITS[category] || DEFAULT_IMAGE_LIMITS;
}

/**
 * Validate image count for category
 * @param {number} count - Number of images
 * @param {string} category - Category name
 * @returns {Object} { valid: boolean, message: string }
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
 * Check if file size is valid
 * @param {number} size - File size in bytes
 * @returns {boolean}
 */
export function isValidFileSize(size) {
  return size <= GLOBAL_IMAGE_LIMITS.maxFileSize;
}




