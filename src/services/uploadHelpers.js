/**
 * UNIVERSAL WEB + MOBILE SAFE UPLOADER
 * VERSION: 12.0.0 - COMPLETE REWRITE (Jan 10, 2026)
 *
 * NEVER uses .path - only .uri for objects, or string data URLs
 */

console.log('🚀🚀🚀 uploadHelpers.js VERSION 12.0.0 - COMPLETE REWRITE 🚀🚀🚀');

/**
 * Convert image to Blob for Firebase Storage upload
 * Supports: data URL strings, objects with uri property
 * NEVER uses .path
 */
export async function imageToBlob(image, index = 0) {
  console.log(`📦 [${index + 1}] imageToBlob called`);

  if (!image) {
    throw new Error(`Image ${index} is undefined`);
  }

  // WEB: base64 data URL (string)
  if (typeof image === "string" && image.startsWith("data:image")) {
    console.log(`📦 [${index + 1}] Converting data URL string to Blob...`);
    const res = await fetch(image);
    const blob = await res.blob();
    console.log(`✅ [${index + 1}] Blob created: ${(blob.size / 1024).toFixed(2)} KB`);
    return blob;
  }

  // WEB: object with uri (data URL)
  if (image.uri && image.uri.startsWith("data:image")) {
    console.log(`📦 [${index + 1}] Converting object.uri data URL to Blob...`);
    const res = await fetch(image.uri);
    const blob = await res.blob();
    console.log(`✅ [${index + 1}] Blob created: ${(blob.size / 1024).toFixed(2)} KB`);
    return blob;
  }

  // MOBILE: file uri
  if (image.uri) {
    console.log(`📦 [${index + 1}] Converting file URI to Blob...`);
    const res = await fetch(image.uri);
    const blob = await res.blob();
    console.log(`✅ [${index + 1}] Blob created: ${(blob.size / 1024).toFixed(2)} KB`);
    return blob;
  }

  // FALLBACK: If it's a File or Blob, return as-is
  if (image instanceof File || image instanceof Blob) {
    console.log(`✅ [${index + 1}] Already a File/Blob: ${(image.size / 1024).toFixed(2)} KB`);
    return image;
  }

  console.error(`❌ [${index + 1}] Unsupported image format:`, image);
  throw new Error(`Unsupported image format at index ${index}`);
}

/**
 * Timeout wrapper for operations
 */
export function withTimeout(promise, ms, operationName) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`⏱️ TIMEOUT: ${operationName} exceeded ${ms}ms`);
      error.code = 'TIMEOUT';
      error.operation = operationName;
      console.error(`⏱️ TIMEOUT: ${operationName} exceeded ${ms}ms`);
      reject(error);
    }, ms);
  });

  return Promise.race([
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        console.log(`✅ ${operationName} completed successfully`);
        return result;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error(`❌ ${operationName} failed:`, error.code || error.message);
        throw error;
      }),
    timeoutPromise,
  ]);
}
