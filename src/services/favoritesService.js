/**
 * Favorites Service
 * Save and retrieve user's favorite listings
 */

import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';

/**
 * Add listing to favorites
 */
export async function addToFavorites(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('userId and listingId are required');
  }

  const db = getFirestore();
  const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);

  await setDoc(favoriteRef, {
    listingId,
    addedAt: new Date().toISOString(),
  });

  console.log('✅ Added to favorites:', listingId);
}

/**
 * Remove listing from favorites
 */
export async function removeFromFavorites(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('userId and listingId are required');
  }

  const db = getFirestore();
  const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);

  await deleteDoc(favoriteRef);
  console.log('✅ Removed from favorites:', listingId);
}

/**
 * Check if listing is favorited
 */
export async function isFavorited(userId, listingId) {
  if (!userId || !listingId) return false;

  const db = getFirestore();
  const favoriteRef = doc(db, 'users', userId, 'favorites', listingId);

  try {
    const snapshot = await getDoc(favoriteRef);
    return snapshot.exists();
  } catch {
    return false;
  }
}

/**
 * Get all favorite listing IDs for a user
 */
export async function getFavoriteIds(userId) {
  if (!userId) return [];

  const db = getFirestore();
  const favoritesRef = collection(db, 'users', userId, 'favorites');

  try {
    const snapshot = await getDocs(favoritesRef);
    return snapshot.docs.map(doc => doc.id);
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

  const db = getFirestore();
  const favoritesRef = collection(db, 'users', userId, 'favorites');

  return onSnapshot(favoritesRef, (snapshot) => {
    const favoriteIds = snapshot.docs.map(doc => doc.id);
    callback(favoriteIds);
  }, (error) => {
    console.error('Error in favorites listener:', error);
    callback([]);
  });
}
