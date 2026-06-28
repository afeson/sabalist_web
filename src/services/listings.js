/**
 * Firebase Firestore & Storage operations for listings
 * Uses Firebase JS SDK for Firestore (avoids gRPC issues on iOS)
 * Uses React Native Firebase for Storage (native file uploads)
 */

import {
  firestore,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
} from "../lib/firebase";
import { CATEGORIES, resolveCategoryId, getLegacyAliasesFor, getVisibleCategories } from "../config/categories";
import { getRanking } from "../config/runtimeConfig";

/**
 * Returns the set of categoryId values to query when the caller asks for
 * `inputId`. Includes the canonical id and any legacy ids that were merged
 * into it so old listings created under those slugs still surface.
 */
function expandCategoryIds(inputId) {
  if (!inputId || inputId === "All") return null;
  const canonical = resolveCategoryId(inputId);
  const legacy = getLegacyAliasesFor(canonical);
  const set = new Set([canonical, ...legacy]);
  // If caller passed a legacy slug directly, include it too.
  set.add(inputId);
  return Array.from(set);
}

/**
 * Create a new listing in Firestore
 * @param {Object} listingData - { title, description, price, category, currency, location, userId }
 * @param {Array} imageUris - Array of local image URIs to upload (up to 30)
 * @returns {Promise<string>} - Document ID
 */
export async function createListing(listingData, imageUris = []) {
  try {
    // Create listing document first to get listingId
    const listingsRef = collection(firestore, "listings");
    // Build the canonical price fields (priceType, amount, currency,
    // isNegotiable, displayPriceText, plus a legacy `price` mirror).
    // If the caller already passed a priceType (the new path from
    // CreateListingScreen), respect it; otherwise infer fixed-USD from
    // the legacy `price`/`currency` fields.
    const priceFields = listingData.priceType
      ? {
          priceType: listingData.priceType,
          amount: listingData.amount ?? null,
          minAmount: listingData.minAmount ?? null,
          maxAmount: listingData.maxAmount ?? null,
          currency: listingData.currency || "USD",
          originalCurrency: listingData.originalCurrency || listingData.currency || "USD",
          isNegotiable: !!listingData.isNegotiable,
          displayPriceText: listingData.displayPriceText || "",
          price: Number(listingData.price) || 0,
        }
      : {
          price: parseFloat(listingData.price) || 0,
          currency: listingData.currency || "USD",
        };

    const docRef = await addDoc(listingsRef, {
      title: listingData.title,
      description: listingData.description || "",
      ...priceFields,
      category: listingData.category,
      subcategory: listingData.subcategory || "",
      location: listingData.location || "Africa",
      phoneNumber: listingData.phoneNumber || "",
      userId: listingData.userId,
      images: [],
      coverImage: "",
      hasImage: false,
      status: "active",
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const listingId = docRef.id;
    console.log(`✅ Listing created: ${listingId}`);

    // Upload images in parallel to listingId-specific folder
    let imageUrls = [];

    if (imageUris.length > 0) {
      console.log(`📤 Uploading ${imageUris.length} images in parallel...`);

      const uploadPromises = imageUris.map((uri, index) =>
        uploadImage(uri, `listings/${listingId}/image-${index}-${Date.now()}.jpg`)
      );

      imageUrls = await Promise.all(uploadPromises);
      console.log(`✅ Uploaded ${imageUrls.length} images`);

      // Update listing with image URLs
      const listingDocRef = doc(firestore, "listings", listingId);
      await updateDoc(listingDocRef, {
        images: imageUrls,
        coverImage: imageUrls[0] || "",
        hasImage: imageUrls.length > 0,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Images linked to listing: ${listingId}`);
    }

    return listingId;
  } catch (error) {
    console.error("❌ Error creating listing:", error);
    throw error;
  }
}

/**
 * Upload image to Firebase Storage (NATIVE VERSION)
 * @param {string} uri - Local image URI
 * @param {string} path - Storage path (e.g., listings/{listingId}/image-0.jpg)
 * @returns {Promise<string>} - Download URL
 */
async function uploadImage(uri, path) {
  try {
    // For React Native, use putFile() instead of blob
    const reference = storage().ref(path);
    await reference.putFile(uri);

    // Get download URL
    const downloadURL = await reference.getDownloadURL();
    console.log(`✅ Uploaded: ${path}`);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading image ${path}:`, error);
    throw error;
  }
}

/**
 * Fetch listings from Firestore
 * @param {Object} options - { category, maxResults }
 * @returns {Promise<Array>} - Array of listings
 */
export async function fetchListings({ category = null, maxResults = 50 } = {}) {
  try {
    const listingsRef = collection(firestore, "listings");
    let q;

    const expandedIds = expandCategoryIds(category);

    if (expandedIds && expandedIds.length === 1) {
      q = query(
        listingsRef,
        where("categoryId", "==", expandedIds[0]),
        orderBy("createdAt", "desc"),
        limit(maxResults)
      );
    } else if (expandedIds && expandedIds.length > 1) {
      // `where in` supports up to 10 values; legacy aliases are well under that.
      q = query(
        listingsRef,
        where("categoryId", "in", expandedIds.slice(0, 10)),
        orderBy("createdAt", "desc"),
        limit(maxResults)
      );
    } else {
      // Home feed: fetch a sample from EACH category in parallel so no single
      // large import (rentals, pets, food…) can dominate the homepage. The
      // caller ranks + round-robins for a diverse feed. Uses the existing
      // categoryId+createdAt index — no new index required.
      const rk = getRanking().perCategory;
      const perCat = Math.max(rk.min, Math.ceil(maxResults / rk.divisor));
      const homeCategories = getVisibleCategories().map((c) => c.id).filter(Boolean);
      const results = await Promise.all(homeCategories.map(async (cid) => {
        try {
          const cq = query(
            listingsRef,
            where("categoryId", "==", cid),
            limit(perCat)
          );
          const snap = await getDocs(cq);
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) { return []; }
      }));
      const merged = results.flat();
      return merged.filter((l) => l.status === 'active' || !l.status);
    }

    const snapshot = await getDocs(q);

    const listings = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    // Filter for active listings (or listings without status field) in-memory
    const activeListings = listings.filter(listing =>
      listing.status === 'active' || !listing.status
    );

    console.log(`✅ Fetched ${activeListings.length} active listings out of ${listings.length} total`);
    return activeListings;
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    throw error;
  }
}

/**
 * Search listings by text (only active listings)
 * @param {string} searchText - Search query
 * @param {string} category - Category filter
 * @param {number} minPrice - Minimum price filter
 * @param {number} maxPrice - Maximum price filter
 * @param {string} subcategoryId - Subcategory filter
 * @param {Object} userLocation - User's location for filtering
 * @returns {Promise<Array>} - Filtered listings
 */
export async function searchListings(searchText = "", category = null, minPrice = null, maxPrice = null, subcategoryId = null, userLocation = null) {
  try {
    console.log('searchListings called with:', { searchText, category, subcategoryId, userLocation });

    // Only fetch active listings for marketplace
    // Home (no category) pulls a wider window so organic photo listings (older
    // than the imports) are present to rank to the top; category stays tight.
    const listings = await fetchListings({ category, maxResults: category ? 50 : 150 });

    // Filter out sold listings for marketplace display
    let activeListings = listings.filter(listing => listing.status === 'active' || !listing.status);

    // Apply subcategory filter if provided
    if (subcategoryId !== null && subcategoryId !== undefined && subcategoryId !== '') {
      console.log(`Filtering by subcategory: ${subcategoryId}`);
      activeListings = activeListings.filter(listing => {
        const match = listing.subcategory === subcategoryId;
        if (match) {
          console.log(`Match found: ${listing.title} has subcategory ${listing.subcategory}`);
        }
        return match;
      });
      console.log(`After subcategory filter: ${activeListings.length} listings`);
    }

    // Apply price-range filter. Uses listingMatchesPriceRange so that:
    //   - Fixed/Negotiable: compared against amount
    //   - Range: overlap test (any part of [minAmount, maxAmount] in range)
    //   - Free/Call-for-price/None: excluded from price-range searches
    //     (buyers searching "items under X" don't want non-priced posts)
    if ((minPrice !== null && minPrice !== '') || (maxPrice !== null && maxPrice !== '')) {
      const { listingMatchesPriceRange } = require('../lib/pricing');
      activeListings = activeListings.filter((l) =>
        listingMatchesPriceRange(l, minPrice, maxPrice)
      );
    }

    // Feed ranking (kept in sync between web + native): real/organic listings
    // WITH product photos first, then any listing with an image, then organic
    // without an image, then the rest; local preferred within a tier; newest
    // last. Never excludes — app and website show the same data / counts.
    {
      const uc = ((userLocation && userLocation.city) || '').toLowerCase();
      const us = ((userLocation && userLocation.state) || '').toLowerCase();
      const uco = ((userLocation && userLocation.country) || '').toLowerCase();
      const isLocal = (l) => {
        const loc = (l.location || '').toLowerCase();
        return !!uc && !!loc && (loc.includes(uc) || (us && loc.includes(us)) || (uco && loc.includes(uco)));
      };
      // Classifieds-first ranking — tier weights, jobs-last, directory prefixes
      // and round-robin all come from backend config (getRanking); the algorithm
      // stays here. Defaults reproduce: 5 organic+photo, 4 import+photo,
      // 3 organic no-photo, 2 import no-photo, 1 directory, 0 jobs.
      const rank = getRanking();
      const tw = rank.tierWeights;
      const isDir = (s) => rank.directorySourcePrefixes.some((p) => (s || '').startsWith(p));
      const tier = (l) => {
        if (rank.jobsLast && l.categoryId === 'jobs') return tw.jobs;
        if (isDir(l.source)) return tw.directory;
        if (!l.source && l.hasImage) return tw.organicPhoto;
        if (l.source && l.hasImage) return tw.importPhoto;
        if (!l.source) return tw.organicNoPhoto;
        return tw.importNoPhoto;
      };
      activeListings = [...activeListings].sort((a, b) => {
        const t = tier(b) - tier(a); if (t) return t;
        const lo = (isLocal(b) ? 1 : 0) - (isLocal(a) ? 1 : 0); if (lo) return lo;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      // Diversify by category (round-robin) so one large import can't dominate
      // the homepage. Lead = tier >= leadMinTier; trailing stays last. Home feed only.
      if (rank.roundRobin.enabled && !searchText.trim() && !category && !subcategoryId) {
        const roundRobin = (arr) => {
          const m = new Map();
          for (const l of arr) { const k = l.categoryId || 'other'; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }
          const buckets = [...m.values()]; const out = []; let any = true;
          while (any) { any = false; for (const b of buckets) { if (b.length) { out.push(b.shift()); any = true; } } }
          return out;
        };
        const leadMin = rank.roundRobin.leadMinTier;
        const lead = activeListings.filter((l) => tier(l) >= leadMin);
        const trail = activeListings.filter((l) => tier(l) < leadMin);
        activeListings = [...roundRobin(lead), ...roundRobin(trail)];
      }
    }

    // Apply text search
    if (!searchText.trim()) {
      return activeListings;
    }

    const lowerSearch = searchText.toLowerCase();
    return activeListings.filter(listing => {
      const titleMatch = listing.title?.toLowerCase().includes(lowerSearch);
      const descMatch = listing.description?.toLowerCase().includes(lowerSearch);
      const categoryMatch = listing.category?.toLowerCase().includes(lowerSearch);
      const locationMatch = listing.location?.toLowerCase().includes(lowerSearch);
      return titleMatch || descMatch || categoryMatch || locationMatch;
    });
  } catch (error) {
    console.error("❌ Error searching listings:", error);
    throw error;
  }
}

/**
 * Get a single listing by ID
 * @param {string} listingId - Listing document ID
 * @returns {Promise<Object>} - Listing data with id
 */
export async function getListing(listingId) {
  try {
    const docRef = doc(firestore, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Listing not found");
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error("❌ Error fetching listing:", error);
    throw error;
  }
}

/**
 * Get listings for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user's listings
 */
export async function getUserListings(userId) {
  try {
    const listingsRef = collection(firestore, "listings");
    const q = query(
      listingsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);

    const listings = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    console.log(`✅ Fetched ${listings.length} listings for user ${userId}`);
    return listings;
  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    throw error;
  }
}

/**
 * Update an existing listing
 * @param {string} listingId - Listing document ID
 * @param {Object} updateData - Fields to update
 * @param {Array} newImageUris - Optional new images to upload
 * @param {Array} existingImages - Current images to keep
 * @returns {Promise<void>}
 */
export async function updateListing(listingId, updateData, newImageUris = [], existingImages = []) {
  try {
    // Upload new images if provided (in parallel to listing folder)
    let newImageUrls = [];
    if (newImageUris.length > 0) {
      console.log(`📤 Uploading ${newImageUris.length} new images in parallel...`);

      const uploadPromises = newImageUris.map((uri, index) =>
        uploadImage(uri, `listings/${listingId}/image-${Date.now()}-${index}.jpg`)
      );

      newImageUrls = await Promise.all(uploadPromises);
      console.log(`✅ Uploaded ${newImageUrls.length} new images`);
    }

    // Combine existing and new images (in order)
    const allImages = [...existingImages, ...newImageUrls];

    // Prepare update data
    const updates = {
      ...updateData,
      images: allImages,
      coverImage: allImages[0] || "",
      updatedAt: serverTimestamp()
    };

    const docRef = doc(firestore, "listings", listingId);
    await updateDoc(docRef, updates);
    console.log(`✅ Listing updated: ${listingId} with ${allImages.length} images`);
  } catch (error) {
    console.error("❌ Error updating listing:", error);
    throw error;
  }
}

/**
 * Mark listing as sold
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function markListingAsSold(listingId) {
  try {
    const docRef = doc(firestore, "listings", listingId);
    await updateDoc(docRef, {
      status: 'sold',
      soldAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Listing marked as sold: ${listingId}`);
  } catch (error) {
    console.error("❌ Error marking listing as sold:", error);
    throw error;
  }
}

/**
 * Reactivate a sold listing
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function reactivateListing(listingId) {
  try {
    const docRef = doc(firestore, "listings", listingId);
    await updateDoc(docRef, {
      status: 'active',
      soldAt: null,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Listing reactivated: ${listingId}`);
  } catch (error) {
    console.error("❌ Error reactivating listing:", error);
    throw error;
  }
}

/**
 * Increment listing view count
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function incrementListingViews(listingId) {
  try {
    const docRef = doc(firestore, "listings", listingId);
    await updateDoc(docRef, {
      views: increment(1),
      lastViewedAt: serverTimestamp()
    });
    console.log(`👁️ View counted for listing: ${listingId}`);
  } catch (error) {
    // Fail silently - views are not critical
    console.warn("⚠️ Could not increment views:", error.message);
  }
}

/**
 * Delete a listing and its images from storage
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function deleteListing(listingId) {
  try {
    // Delete images from storage
    const listing = await getListing(listingId);
    if (listing.images && listing.images.length > 0) {
      console.log(`🗑️ Deleting ${listing.images.length} images from storage...`);

      // Parallel deletion for better performance
      const deletePromises = listing.images.map(async (imageUrl) => {
        try {
          // Extract path from URL
          const urlPath = imageUrl.split('/o/')[1]?.split('?')[0];
          if (urlPath) {
            const decodedPath = decodeURIComponent(urlPath);
            const imageRef = storage().ref(decodedPath);
            await imageRef.delete();
            console.log(`✅ Deleted image: ${decodedPath}`);
          }
        } catch (err) {
          console.warn("⚠️ Could not delete image:", err.message);
          // Continue even if image deletion fails
        }
      });

      await Promise.all(deletePromises);
    }

    // Delete the document
    const docRef = doc(firestore, "listings", listingId);
    await deleteDoc(docRef);

    console.log(`✅ Listing deleted: ${listingId}`);
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time user listings updates (NATIVE VERSION)
 * @param {string} userId - User ID
 * @param {function} callback - Called with array of listings on each update
 * @returns {function} unsubscribe function
 */
export function subscribeToUserListings(userId, callback) {
  try {
    const q = query(
      collection(firestore, "listings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listings = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      callback(listings);
    }, (error) => {
      console.error("❌ Error in user listings listener:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up user listings listener:", error);
    callback([]);
    return () => {};
  }
}
