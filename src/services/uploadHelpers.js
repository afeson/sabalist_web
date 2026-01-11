/**
 * Platform-specific image upload helpers
 * VERSION: 11.0.0 - NEVER USE .path (Jan 10, 2026)
 *
 * WEB: Handles image objects OR strings from mobile/desktop browsers
 * - Accepts File, Blob, data URL, blob URL, or image objects
 * - Extracts source from objects with dataUrl, webPath, base64, uri properties
 * - NEVER uses image.path (doesn't exist on web)
 * - Always normalizes to Blob before Firebase upload
 *
 * NATIVE: Uses file URIs with React Native Firebase
 *
 * CRITICAL FIX: Now calls getImageSource() FIRST to handle mobile browser
 * image objects before any string operations
 */

import { Platform } from 'react-native';

console.log('🚀🚀🚀 uploadHelpers.js VERSION 11.0.0 - NEVER USE .path 🚀🚀🚀');
console.log('🚀 Platform.OS:', Platform.OS);
console.log('🚀 User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

/**
 * Upload image - platform-aware
 * @param {string} imageUri - Data URL (web) or file URI (native)
 * @param {string} listingId - Firestore listing ID
 * @param {number} index - Image index
 * @returns {Promise<string>} Download URL
 */
export async function uploadImage(imageInput, listingId, index) {
  const startTime = Date.now();
  console.log(`📤 [${index + 1}] ========== UPLOAD START ==========`);
  console.log(`📤 [${index + 1}] Platform.OS: "${Platform.OS}"`);
  console.log(`📤 [${index + 1}] imageInput type: ${typeof imageInput}`);
  console.log(`📤 [${index + 1}] imageInput exists: ${!!imageInput}`);

  if (!imageInput) {
    throw new Error(`Image input is null or undefined for image ${index + 1}`);
  }

  // Extract source from image object if it's an object (handles mobile browser camera/picker objects)
  const imageUri = getImageSource(imageInput, index);

  if (!imageUri) {
    console.error(`❌ [${index + 1}] Could not extract image source from:`, imageInput);
    throw new Error(`Image ${index + 1}: No valid image source found. Checked: dataUrl, webPath, base64, uri`);
  }

  console.log(`📤 [${index + 1}] Extracted imageUri type: ${typeof imageUri}`);
  if (typeof imageUri === 'string') {
    console.log(`📤 [${index + 1}] imageUri length: ${imageUri.length}`);
    console.log(`📤 [${index + 1}] imageUri preview: ${imageUri.substring(0, 50)}...`);
    console.log(`📤 [${index + 1}] Starts with 'data:': ${imageUri.startsWith('data:')}`);
    console.log(`📤 [${index + 1}] Starts with 'file:': ${imageUri.startsWith('file:')}`);
  }

  if (Platform.OS === 'web') {
    console.log(`📤 [${index + 1}] ✅ Routing to WEB upload`);
    return await uploadImageWeb(imageUri, listingId, index, startTime);
  } else {
    console.log(`📤 [${index + 1}] ✅ Routing to NATIVE upload`);
    return await uploadImageNative(imageUri, listingId, index, startTime);
  }
}

/**
 * UNIVERSAL: Extract upload source - NEVER uses .path
 * Supports: data URLs (web base64), http URLs (already uploaded), file URIs (mobile)
 */
function getImageSource(image, index) {
  console.log(`🔍 [${index + 1}] Extracting source:`, {
    type: typeof image,
    isFile: image instanceof File,
    isBlob: image instanceof Blob,
  });

  // CASE 1: Already a File or Blob
  if (image instanceof File || image instanceof Blob) {
    console.log(`✅ [${index + 1}] File/Blob object`);
    return image;
  }

  // CASE 2: Already a string URI
  if (typeof image === 'string') {
    console.log(`✅ [${index + 1}] String URI`);
    return image;
  }

  // CASE 3: Object with uri property
  if (image?.uri) {
    const uri = image.uri;

    // WEB: data URL (base64)
    if (uri.startsWith('data:image')) {
      console.log(`✅ [${index + 1}] WEB base64 from uri`);
      return uri;
    }

    // Already uploaded (Firebase Storage URL)
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log(`✅ [${index + 1}] HTTP URL from uri`);
      return uri;
    }

    // MOBILE: file URI or blob URL
    if (uri.startsWith('file://') || uri.startsWith('blob:')) {
      console.log(`✅ [${index + 1}] Mobile file/blob URI`);
      return uri;
    }

    // Any other uri value
    console.log(`✅ [${index + 1}] Generic URI`);
    return uri;
  }

  // NEVER check .path - does not exist on web
  console.error(`❌ [${index + 1}] Invalid image source. No uri, File, Blob, or string found.`);
  console.error(`❌ [${index + 1}] Received:`, image);
  return null;
}

/**
 * WEB: Universal upload handler - handles ALL input types
 * Accepts: File, Blob, data URL, blob URL, HTTP URL, or image objects
 * Always normalizes to Blob before upload
 * NEVER uses image.path (doesn't exist on web)
 */
async function uploadImageWeb(imageUri, listingId, index, startTime) {
  console.log(`📦 [${index + 1}] ========== WEB UPLOAD START ==========`);
  console.log(`📦 [${index + 1}] imageUri type: ${typeof imageUri}`);
  console.log(`📦 [${index + 1}] imageUri preview: ${String(imageUri).substring(0, 100)}`);

  let blob;
  let inputType;

  try {
    // Case 1: File object (desktop file picker)
    if (imageUri instanceof File) {
      inputType = 'File';
      console.log(`📦 [${index + 1}] Detected File object: ${imageUri.name}, ${(imageUri.size / 1024).toFixed(2)} KB`);
      blob = imageUri;
    }
    // Case 2: Blob object (direct blob)
    else if (imageUri instanceof Blob) {
      inputType = 'Blob';
      console.log(`📦 [${index + 1}] Detected Blob object: ${(imageUri.size / 1024).toFixed(2)} KB`);
      blob = imageUri;
    }
    // Case 3: Data URL (base64) - from expo-image-manipulator
    else if (typeof imageUri === 'string' && imageUri.startsWith('data:')) {
      inputType = 'data URL (base64)';
      console.log(`📦 [${index + 1}] Detected data URL, converting to Blob...`);
      const response = await fetch(imageUri);
      blob = await response.blob();
      console.log(`📦 [${index + 1}] Converted to Blob: ${(blob.size / 1024).toFixed(2)} KB`);
    }
    // Case 4: Blob URL (blob:http...) - from camera or picker
    else if (typeof imageUri === 'string' && imageUri.startsWith('blob:')) {
      inputType = 'blob URL';
      console.log(`📦 [${index + 1}] Detected blob URL, fetching...`);
      const response = await fetch(imageUri);
      blob = await response.blob();
      console.log(`📦 [${index + 1}] Fetched Blob: ${(blob.size / 1024).toFixed(2)} KB`);
    }
    // Case 5: HTTP/HTTPS URL (rare, but handle it)
    else if (typeof imageUri === 'string' && (imageUri.startsWith('http://') || imageUri.startsWith('https://'))) {
      inputType = 'HTTP URL';
      console.log(`📦 [${index + 1}] Detected HTTP URL, fetching...`);
      const response = await fetch(imageUri);
      blob = await response.blob();
      console.log(`📦 [${index + 1}] Fetched Blob: ${(blob.size / 1024).toFixed(2)} KB`);
    }
    else {
      throw new Error(`Unsupported imageUri type: ${typeof imageUri}, value: ${String(imageUri).substring(0, 50)}`);
    }

    console.log(`✅ [${index + 1}] Input type: ${inputType}`);
    console.log(`✅ [${index + 1}] Final Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
    console.log(`✅ [${index + 1}] Final Blob type: ${blob.type}`);

  } catch (error) {
    console.error(`❌ [${index + 1}] Blob conversion failed:`, error.message);
    throw new Error(`Failed to convert image ${index + 1} to Blob: ${error.message}`);
  }

  // Upload to Firebase Storage - Direct SDK import to bypass factory caching issues
  const storagePath = `listings/${listingId}/image-${index}-${Date.now()}.jpg`;
  console.log(`🔍 [${index + 1}] Creating storage ref for: ${storagePath}`);

  // Import Firebase Storage functions directly to avoid factory issues
  const { getStorage, ref: storageRef, uploadBytes: upload, getDownloadURL: getURL } = await import('firebase/storage');
  const { getApps } = await import('firebase/app');

  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Firebase app not initialized');
  }
  const storage = getStorage(apps[0]);
  const fileRef = storageRef(storage, storagePath);
  console.log(`🔍 [${index + 1}] Storage ref created:`, !!fileRef);

  console.log(`📤 [${index + 1}] Uploading to Storage: ${storagePath}`);

  try {
    const uploadResult = await upload(fileRef, blob);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${index + 1}] Upload complete in ${elapsed}s, size: ${uploadResult.metadata.size} bytes`);
  } catch (error) {
    console.error(`❌ [${index + 1}] uploadBytes failed:`, error.code, error.message);
    throw new Error(`Storage upload failed for image ${index + 1}: ${error.message}`);
  }

  // Get download URL
  let downloadURL;
  try {
    downloadURL = await getURL(fileRef);
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
 * NATIVE: Upload image from file URI using React Native Firebase
 */
async function uploadImageNative(fileUri, listingId, index, startTime) {
  console.log(`📦 [${index + 1}] Native upload: Using file URI directly`);
  console.log(`📦 [${index + 1}] File URI: ${fileUri}`);

  const storagePath = `listings/${listingId}/image-${index}-${Date.now()}.jpg`;

  try {
    // For React Native, we need to use @react-native-firebase/storage
    // Import dynamically to avoid errors on web
    const { default: storage } = await import('@react-native-firebase/storage');

    const reference = storage().ref(storagePath);
    console.log(`📤 [${index + 1}] Uploading to: ${storagePath}`);

    // Use putFile for React Native
    await reference.putFile(fileUri);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${index + 1}] Upload complete in ${elapsed}s`);

    const downloadURL = await reference.getDownloadURL();
    console.log(`✅ [${index + 1}] Download URL: ${downloadURL.substring(0, 60)}...`);

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${index + 1}] Total upload time: ${totalElapsed}s`);

    return downloadURL;
  } catch (error) {
    console.error(`❌ [${index + 1}] Native upload failed:`, error);
    console.error(`❌ [${index + 1}] Error code:`, error.code);
    console.error(`❌ [${index + 1}] Error message:`, error.message);
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
