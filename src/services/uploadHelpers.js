/**
 * Platform-specific image upload helpers
 * Handles Blob conversion for web, native file URIs for mobile
 */

import { Platform } from 'react-native';
import { getFirebase } from '../lib/firebaseFactory';

/**
 * Upload image - platform-aware
 * @param {string} imageUri - Data URL (web) or file URI (native)
 * @param {string} listingId - Firestore listing ID
 * @param {number} index - Image index
 * @returns {Promise<string>} Download URL
 */
export async function uploadImage(imageUri, listingId, index) {
  const startTime = Date.now();
  console.log(`📤 [${index + 1}] uploadImage called, platform: ${Platform.OS}`);
  console.log(`📤 [${index + 1}] URI type: ${imageUri.substring(0, 30)}...`);

  if (Platform.OS === 'web') {
    return await uploadImageWeb(imageUri, listingId, index, startTime);
  } else {
    return await uploadImageNative(imageUri, listingId, index, startTime);
  }
}

/**
 * WEB: Upload image from data URL
 */
async function uploadImageWeb(dataURL, listingId, index, startTime) {
  console.log(`📦 [${index + 1}] Web upload: Converting data URL to Blob...`);

  // Validate data URL format
  const matches = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    const error = new Error(`Invalid data URL format for image ${index + 1}`);
    console.error(`❌ [${index + 1}] Data URL validation failed`);
    throw error;
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  console.log(`📦 [${index + 1}] MIME: ${mimeType}, base64 length: ${base64Data.length} chars`);

  // Convert base64 to Blob
  let blob;
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: mimeType });
    console.log(`📦 [${index + 1}] Blob created: ${(blob.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`❌ [${index + 1}] Blob conversion failed:`, error.message);
    throw new Error(`Failed to convert image ${index + 1} to Blob: ${error.message}`);
  }

  // Upload to Firebase Storage
  const fb = getFirebase();

  // Debug: Check what's in fb
  console.log(`🔍 [${index + 1}] Firebase object keys:`, Object.keys(fb));
  console.log(`🔍 [${index + 1}] fb.storage:`, typeof fb.storage, !!fb.storage);
  console.log(`🔍 [${index + 1}] fb.ref:`, typeof fb.ref, !!fb.ref);

  const storagePath = `listings/${listingId}/image-${index}-${Date.now()}.jpg`;
  const storageRef = fb.ref(fb.storage, storagePath);

  console.log(`📤 [${index + 1}] Uploading to Storage: ${storagePath}`);

  try {
    const uploadResult = await fb.uploadBytes(storageRef, blob);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${index + 1}] Upload complete in ${elapsed}s, size: ${uploadResult.metadata.size} bytes`);
  } catch (error) {
    console.error(`❌ [${index + 1}] uploadBytes failed:`, error.code, error.message);
    throw new Error(`Storage upload failed for image ${index + 1}: ${error.message}`);
  }

  // Get download URL
  let downloadURL;
  try {
    downloadURL = await fb.getDownloadURL(storageRef);
    console.log(`✅ [${index + 1}] Download URL obtained: ${downloadURL.substring(0, 60)}...`);
  } catch (error) {
    console.error(`❌ [${index + 1}] getDownloadURL failed:`, error.message);
    throw new Error(`Failed to get download URL for image ${index + 1}: ${error.message}`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ [${index + 1}] Total upload time: ${totalElapsed}s`);

  return downloadURL;
}

/**
 * NATIVE: Upload image from file URI
 */
async function uploadImageNative(fileUri, listingId, index, startTime) {
  console.log(`📦 [${index + 1}] Native upload: Using file URI directly`);

  const fb = getFirebase();
  const storagePath = `listings/${listingId}/image-${index}-${Date.now()}.jpg`;

  try {
    const reference = fb.storage().ref(storagePath);
    console.log(`📤 [${index + 1}] Uploading to: ${storagePath}`);

    await reference.putFile(fileUri);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${index + 1}] Upload complete in ${elapsed}s`);

    const downloadURL = await reference.getDownloadURL();
    console.log(`✅ [${index + 1}] Download URL: ${downloadURL.substring(0, 60)}...`);

    return downloadURL;
  } catch (error) {
    console.error(`❌ [${index + 1}] Native upload failed:`, error.message);
    throw new Error(`Failed to upload image ${index + 1}: ${error.message}`);
  }
}

/**
 * Timeout wrapper with detailed logging
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
