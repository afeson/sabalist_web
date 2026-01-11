/**
 * uploadHelpers.js
 * VERSION: 12.0.0 - COMPLETE REWRITE
 * Platform-safe image upload - NEVER uses .path
 */

console.log('🚀 uploadHelpers.js VERSION 12.0.0 - COMPLETE REWRITE');

/**
 * Convert any image format to Blob
 * Supports: data URLs, Blob objects, objects with .uri, File objects
 * NEVER uses .path
 */
export async function imageToBlob(image, index = 0) {
  console.log(`📦 imageToBlob called for image ${index + 1}`);

  // CASE 1: String data URL
  if (typeof image === 'string' && image.startsWith('data:')) {
    console.log(`📦 Image ${index + 1}: Converting data URL to Blob`);
    const res = await fetch(image);
    const blob = await res.blob();
    console.log(`✅ Image ${index + 1}: Blob created (${(blob.size / 1024).toFixed(2)} KB)`);
    return blob;
  }

  // CASE 2: Already a Blob
  if (image instanceof Blob) {
    console.log(`✅ Image ${index + 1}: Already a Blob (${(image.size / 1024).toFixed(2)} KB)`);
    return image;
  }

  // CASE 3: File object
  if (image instanceof File) {
    console.log(`✅ Image ${index + 1}: File object (${(image.size / 1024).toFixed(2)} KB)`);
    return image;
  }

  // CASE 4: Object with .uri property (mobile or web blob URL)
  if (image?.uri) {
    console.log(`📦 Image ${index + 1}: Converting uri to Blob`);
    const res = await fetch(image.uri);
    const blob = await res.blob();
    console.log(`✅ Image ${index + 1}: Blob created from uri (${(blob.size / 1024).toFixed(2)} KB)`);
    return blob;
  }

  // CASE 5: Object with .file property
  if (image?.file) {
    console.log(`✅ Image ${index + 1}: Using .file property`);
    return image.file;
  }

  console.error(`❌ Image ${index + 1}: Unsupported format`, image);
  throw new Error(`Unsupported image format at index ${index}`);
}

export function withTimeout(promise, ms, operationName) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${operationName} exceeded ${ms}ms`));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}
