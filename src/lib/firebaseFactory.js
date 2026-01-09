/**
 * Platform-aware Firebase factory
 * NO static imports - all runtime resolution
 * Ensures Firebase instances are properly initialized on both web and native
 * VERSION: 2.0.0 - CACHE BUSTED
 */

import { Platform } from 'react-native';

console.log('🚀 firebaseFactory.js VERSION 2.0.0 loaded');

let firebaseCache = null;

/**
 * Get Firebase instances based on platform
 * Called at RUNTIME, not module load time
 */
export function getFirebase() {
  // Return cached instance if already initialized
  if (firebaseCache) {
    return firebaseCache;
  }

  if (Platform.OS === 'web') {
    // Web: Dynamic require for Firebase Web SDK
    const firebaseWebModule = require('./firebase.web');
    const firestoreSDK = require('firebase/firestore');
    const storageSDK = require('firebase/storage');

    console.log('🔧 Firebase factory - Web platform detected');
    console.log('🔧 firebaseWebModule keys:', Object.keys(firebaseWebModule));
    console.log('🔧 firebaseWebModule.auth:', typeof firebaseWebModule.auth, !!firebaseWebModule.auth);
    console.log('🔧 firebaseWebModule.firestore:', typeof firebaseWebModule.firestore, !!firebaseWebModule.firestore);
    console.log('🔧 firebaseWebModule.storage:', typeof firebaseWebModule.storage, !!firebaseWebModule.storage);

    firebaseCache = {
      auth: firebaseWebModule.auth,
      firestore: firebaseWebModule.firestore,
      storage: firebaseWebModule.storage,
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

    console.log('🔧 Firebase cache created:');
    console.log('🔧  - auth:', typeof firebaseCache.auth, !!firebaseCache.auth);
    console.log('🔧  - firestore:', typeof firebaseCache.firestore, !!firebaseCache.firestore);
    console.log('🔧  - storage:', typeof firebaseCache.storage, !!firebaseCache.storage);
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
