/**
 * Favorites Service
 *
 * Native (iOS/Android): @react-native-firebase/firestore — inherits the
 * native auth session, so the user-scoped Firestore rules in firestore.rules
 * (`request.auth.uid == userId`) actually pass.
 *
 * Web: Firebase JS SDK Firestore — shares auth state with the web auth SDK,
 * so the same rules pass.
 *
 * The split exists because the rest of the app uses the JS SDK Firestore on
 * native too (see src/lib/firebase.js), and the JS SDK has no view of the
 * native auth context — so every favorites operation was being denied.
 */

import { Platform } from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { recordFavoriteAdded } from './reviewService';

const isWeb = Platform.OS === 'web';

// Native firestore is only required on native; on web webpack aliases the
// package to a no-op mock (see webpack.config.js), so this require would be
// harmless there too — but guard it anyway to keep the web bundle clean.
let nativeFirestore;
if (!isWeb) {
  nativeFirestore = require('@react-native-firebase/firestore').default;
}

/**
 * Add listing to favorites
 */
export async function addToFavorites(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('userId and listingId are required');
  }

  const payload = {
    listingId,
    addedAt: new Date().toISOString(),
  };

  if (isWeb) {
    const db = getFirestore();
    const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);
    await setDoc(favoriteRef, payload);
  } else {
    await nativeFirestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(listingId)
      .set(payload);
  }

  console.log('Added to favorites:', listingId);

  // Count this favorite toward the in-app review policy (native only; no-op on
  // web). Fire-and-forget so it never blocks or fails the favorite action.
  recordFavoriteAdded().catch(() => {});
}

/**
 * Remove listing from favorites
 */
export async function removeFromFavorites(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('userId and listingId are required');
  }

  if (isWeb) {
    const db = getFirestore();
    const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);
    await deleteDoc(favoriteRef);
  } else {
    await nativeFirestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(listingId)
      .delete();
  }

  console.log('Removed from favorites:', listingId);
}

/**
 * Check if listing is favorited
 */
export async function isFavorited(userId, listingId) {
  if (!userId || !listingId) return false;

  try {
    if (isWeb) {
      const db = getFirestore();
      const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);
      const snapshot = await getDoc(favoriteRef);
      return snapshot.exists();
    } else {
      const snapshot = await nativeFirestore()
        .collection('users')
        .doc(userId)
        .collection('favorites')
        .doc(listingId)
        .get();
      return snapshot.exists;
    }
  } catch {
    return false;
  }
}

/**
 * Get all favorite listing IDs for a user
 */
export async function getFavoriteIds(userId) {
  if (!userId) return [];

  try {
    if (isWeb) {
      const db = getFirestore();
      const favoritesRef = collection(db, 'users', userId, 'favorites');
      const snapshot = await getDocs(favoritesRef);
      return snapshot.docs.map(d => d.id);
    } else {
      const snapshot = await nativeFirestore()
        .collection('users')
        .doc(userId)
        .collection('favorites')
        .get();
      return snapshot.docs.map(d => d.id);
    }
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

/**
 * Subscribe to favorites changes
 */
export function subscribeToFavorites(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  if (isWeb) {
    const db = getFirestore();
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    return onSnapshot(
      favoritesRef,
      (snapshot) => callback(snapshot.docs.map(d => d.id)),
      (error) => {
        console.error('Error in favorites listener:', error);
        callback([]);
      }
    );
  }

  return nativeFirestore()
    .collection('users')
    .doc(userId)
    .collection('favorites')
    .onSnapshot(
      (snapshot) => callback(snapshot.docs.map(d => d.id)),
      (error) => {
        console.error('Error in favorites listener:', error);
        callback([]);
      }
    );
}
