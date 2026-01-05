/**
 * Platform-aware Firebase factory
 * NO static imports - all runtime resolution
 * Ensures Firebase instances are properly initialized on both web and native
 */

import { Platform } from 'react-native';

let firebaseCache = null;

/**
 * Get Firebase instances based on platform
 * Called at RUNTIME, not module load time
 */
export function getFirebase() {
  if (firebaseCache) {
    return firebaseCache;
  }

  if (Platform.OS === 'web') {
    // Web: Dynamic require for Firebase Web SDK
    const firebaseWeb = require('./firebase.web');
    const firestoreSDK = require('firebase/firestore');
    const storageSDK = require('firebase/storage');

    firebaseCache = {
      auth: firebaseWeb.auth,
      firestore: firebaseWeb.firestore,
      storage: firebaseWeb.storage,
      // Firestore methods
      collection: firestoreSDK.collection,
      addDoc: firestoreSDK.addDoc,
      updateDoc: firestoreSDK.updateDoc,
      doc: firestoreSDK.doc,
      serverTimestamp: firestoreSDK.serverTimestamp,
      // Storage methods
      ref: storageSDK.ref,
      uploadBytes: storageSDK.uploadBytes,
      getDownloadURL: storageSDK.getDownloadURL,
    };
  } else {
    // Native: Dynamic require for React Native Firebase
    const firebaseNative = require('./firebase');

    firebaseCache = {
      auth: firebaseNative.auth,
      firestore: firebaseNative.firestore,
      storage: firebaseNative.storage,
      // Native uses different API pattern
      collection: null,
      addDoc: null,
      updateDoc: null,
      doc: null,
      serverTimestamp: null,
      ref: null,
      uploadBytes: null,
      getDownloadURL: null,
    };
  }

  console.log('🔧 Firebase factory initialized for platform:', Platform.OS);
  return firebaseCache;
}

/**
 * Reset cache (for testing only)
 */
export function resetFirebaseCache() {
  firebaseCache = null;
}
