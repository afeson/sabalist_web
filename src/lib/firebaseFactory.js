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
    const firebaseWebModule = require('./firebase.web');
    const firestoreSDK = require('firebase/firestore');
    const storageSDK = require('firebase/storage');

    // Handle both default and named exports
    const firebaseWeb = firebaseWebModule.default || firebaseWebModule;

    console.log('🔧 Firebase factory - Web platform detected');
    console.log('🔧 firebaseWebModule keys:', Object.keys(firebaseWebModule));
    console.log('🔧 has default?', !!firebaseWebModule.default);
    console.log('🔧 firebaseWeb.auth:', typeof firebaseWeb.auth, !!firebaseWeb.auth);
    console.log('🔧 firebaseWeb.firestore:', typeof firebaseWeb.firestore, !!firebaseWeb.firestore);
    console.log('🔧 firebaseWeb.storage:', typeof firebaseWeb.storage, !!firebaseWeb.storage);

    firebaseCache = {
      auth: firebaseWeb.auth,
      firestore: firebaseWeb.firestore,
      storage: firebaseWeb.storage,
      // Firestore methods
      collection: firestoreSDK.collection,
      addDoc: firestoreSDK.addDoc,
      updateDoc: firestoreSDK.updateDoc,
      doc: firestoreSDK.doc,
      getDoc: firestoreSDK.getDoc,
      serverTimestamp: firestoreSDK.serverTimestamp,
      // Storage methods
      ref: storageSDK.ref,
      uploadBytes: storageSDK.uploadBytes,
      getDownloadURL: storageSDK.getDownloadURL,
    };

    console.log('🔧 Firebase cache created with firestore:', typeof firebaseCache.firestore, !!firebaseCache.firestore);
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
