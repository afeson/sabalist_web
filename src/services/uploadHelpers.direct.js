/**
 * DIRECT Firebase Storage upload - NO factory pattern
 * Bypasses all caching and factory issues
 * VERSION: DIRECT 1.0.0
 */

import { Platform } from 'react-native';

console.log('🚀 DIRECT uploadHelpers loaded - VERSION 1.0.0');

/**
 * Upload image - WEB ONLY using direct Firebase imports
 * @param {string} imageUri - Data URL (web)
 * @param {string} listingId - Firestore listing ID
 * @param {number} index - Image index
 * @returns {Promise<string>} Download URL
 */
export async function uploadImage(imageUri, listingId, index) {
  const startTime = Date.now();
  console.log(`📤 [DIRECT ${index + 1}] uploadImage called, platform: ${Platform.OS}`);
  console.log(`📤 [DIRECT ${index + 1}] URI type: ${imageUri.substring(0, 30)}...`);

  if (Platform.OS !== 'web') {
    throw new Error('Direct upload helper only supports web platform');
  }

  // Import Firebase SDK directly at runtime
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const { getApps } = await import('firebase/app');

  console.log(`🔧 [DIRECT ${index + 1}] Firebase modules imported`);

  // Get existing Firebase app
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Firebase app not initialized');
  }
  const app = apps[0];
  console.log(`🔧 [DIRECT ${index + 1}] Firebase app found:`, app.name);

  // Get storage instance
  const storage = getStorage(app);
  console.log(`🔧 [DIRECT ${index + 1}] Storage instance:`, !!storage);

  // Validate data URL format
  const matches = imageUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error(`Invalid data URL format for image ${index + 1}`);
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  console.log(`📦 [DIRECT ${index + 1}] MIME: ${mimeType}, base64 length: ${base64Data.length} chars`);

  // Convert base64 to Blob
  console.log(`📦 [DIRECT ${index + 1}] Converting base64 to Blob...`);
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  console.log(`📦 [DIRECT ${index + 1}] Blob created: ${(blob.size / 1024).toFixed(2)} KB`);

  // Create storage reference
  const storagePath = `listings/${listingId}/image-${index}-${Date.now()}.jpg`;
  console.log(`📤 [DIRECT ${index + 1}] Creating storage ref: ${storagePath}`);
  const storageRef = ref(storage, storagePath);
  console.log(`📤 [DIRECT ${index + 1}] Storage ref created:`, !!storageRef);

  // Upload blob
  console.log(`📤 [DIRECT ${index + 1}] Uploading to Firebase Storage...`);
  try {
    const uploadResult = await uploadBytes(storageRef, blob);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [DIRECT ${index + 1}] Upload complete in ${elapsed}s, size: ${uploadResult.metadata.size} bytes`);
  } catch (error) {
    console.error(`❌ [DIRECT ${index + 1}] uploadBytes failed:`, error);
    throw new Error(`Storage upload failed for image ${index + 1}: ${error.message}`);
  }

  // Get download URL
  console.log(`📤 [DIRECT ${index + 1}] Getting download URL...`);
  try {
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`✅ [DIRECT ${index + 1}] Download URL obtained: ${downloadURL.substring(0, 60)}...`);

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [DIRECT ${index + 1}] Total upload time: ${totalElapsed}s`);

    return downloadURL;
  } catch (error) {
    console.error(`❌ [DIRECT ${index + 1}] getDownloadURL failed:`, error);
    throw new Error(`Failed to get download URL for image ${index + 1}: ${error.message}`);
  }
}

/**
 * Timeout wrapper
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
