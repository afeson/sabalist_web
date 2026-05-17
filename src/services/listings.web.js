/**
 * Web-specific Firebase Firestore & Storage operations for listings
 * Uses Firebase Web SDK
 */

import { firestore, storage } from "../lib/firebase.web";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, limit as firestoreLimit, deleteDoc, increment, getDocsFromServer, getDocFromServer, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { CATEGORIES, resolveCategoryId, getLegacyAliasesFor } from "../config/categories";

const VALID_CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));

function expandCategoryIds(inputId) {
  if (!inputId || inputId === "All") return null;
  const canonical = resolveCategoryId(inputId);
  const legacy = getLegacyAliasesFor(canonical);
  const set = new Set([canonical, ...legacy]);
  set.add(inputId);
  return Array.from(set);
}

/**
 * Create a new listing in Firestore (WEB VERSION)
 */
export async function createListing(listingData, imageUris = [], videoData = null) {
  try {
    console.log('📝 Creating listing with data:', {
      ...listingData,
      imageCount: imageUris.length,
      hasVideo: !!videoData
    });

    // Validate against the source-of-truth category list.
    if (!listingData.category || !VALID_CATEGORY_KEYS.has(listingData.category)) {
      throw new Error('Invalid category. Please select a valid category.');
    }

    const listingRef = await addDoc(collection(firestore, "listings"), {
      title: listingData.title,
      description: listingData.description || "",
      price: parseFloat(listingData.price) || 0,
      currency: listingData.currency || "USD",
      category: listingData.category, // ✅ FIX: No fallback - must be valid
      subcategory: listingData.subcategory || "", // Add subcategory field
      location: listingData.location || "Africa",
      phoneNumber: listingData.phoneNumber || "",
      userId: listingData.userId,
      images: [],
      coverImage: "",
      videoUrl: "",
      status: "active",
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const listingId = listingRef.id;
    console.log(`✅ Listing created in Firestore: ${listingId}`);

    let imageUrls = [];
    let videoUrl = "";

    // Upload images with individual error handling
    if (imageUris.length > 0) {
      console.log(`📤 Uploading ${imageUris.length} images...`);

      try {
        // Upload images sequentially to avoid overwhelming the connection
        for (let index = 0; index < imageUris.length; index++) {
          try {
            console.log(`📤 [${index + 1}/${imageUris.length}] Starting upload...`);
            const url = await uploadImage(
              imageUris[index],
              `listings/${listingId}/image-${index}-${Date.now()}.jpg`
            );
            imageUrls.push(url);
            console.log(`✅ [${index + 1}/${imageUris.length}] Upload complete`);
          } catch (err) {
            console.error(`❌ [${index + 1}/${imageUris.length}] Failed:`, err.message);
            // Continue with next image
          }
        }
        console.log(`✅ Uploaded ${imageUrls.length} out of ${imageUris.length} images`);
      } catch (err) {
        console.error('❌ Error during image upload batch:', err);
        // Continue even if image uploads fail
      }
    }

    // Upload video if present
    if (videoData && videoData.uri) {
      console.log(`📤 Uploading video...`);
      try {
        const videoExtension = videoData.type === 'video/quicktime' ? 'mov' : 'mp4';
        videoUrl = await uploadVideo(videoData.uri, `listings/${listingId}/video-${Date.now()}.${videoExtension}`);
        console.log(`✅ Uploaded video`);
      } catch (err) {
        console.error('❌ Video upload failed:', err);
        // Continue even if video upload fails
      }
    }

    // Update listing with media URLs
    console.log('📝 Updating listing with media URLs...');
    console.log(`📝 Image URLs to save (${imageUrls.length}):`, imageUrls);
    console.log(`📝 Cover image:`, imageUrls[0] || "");
    console.log(`📝 Video URL:`, videoUrl);

    await updateDoc(doc(firestore, "listings", listingId), {
      images: imageUrls,
      coverImage: imageUrls[0] || "",
      videoUrl: videoUrl,
      updatedAt: serverTimestamp()
    });

    // Verify the update was successful by reading back the document
    console.log('🔍 Verifying listing was updated correctly...');
    const verifyDoc = await getDocFromServer(doc(firestore, "listings", listingId));
    if (verifyDoc.exists()) {
      const savedData = verifyDoc.data();
      console.log('✅ Verification: images array in Firestore =', savedData.images?.length || 0, 'images');
      console.log('✅ Verification: images URLs =', savedData.images);
      if (savedData.images?.length !== imageUrls.length) {
        console.error('❌ WARNING: Saved images count does not match uploaded count!');
        console.error('   Expected:', imageUrls.length, 'Got:', savedData.images?.length);
      }
    }

    console.log(`✅ Listing ${listingId} completed successfully!`);
    return listingId;
  } catch (error) {
    console.error("❌ Error creating listing:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

async function uploadImage(uri, path) {
  try {
    console.log(`📤 Processing image: ${uri.substring(0, 50)}...`);

    let blob;

    // ✅ FIX: Handle data URLs differently than blob URLs
    if (uri.startsWith('data:')) {
      console.log(`📦 Converting data URL to blob...`);
      // Data URL - convert directly to blob without fetch
      const base64Data = uri.split(',')[1];
      const mimeType = uri.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mimeType });
      console.log(`📦 Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
    } else {
      // Blob URL - use fetch with timeout
      console.log(`📤 Fetching blob from URI...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(uri, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        blob = await response.blob();
        console.log(`📦 Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Image fetch timeout - please try with a smaller image or check your connection');
        }
        throw fetchError;
      }
    }

    console.log(`☁️ Uploading to Firebase Storage: ${path}`);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);

    console.log(`🔗 Getting download URL...`);
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`✅ Upload complete: ${path}`);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading image ${path}:`, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      uri: uri.substring(0, 100)
    });
    throw error;
  }
}

async function uploadVideo(uri, path) {
  try {
    console.log(`📤 Fetching video from URI...`);

    // Create AbortController for fetch timeout (longer for videos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for video fetch

    try {
      const response = await fetch(uri, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`📦 Converting video to blob...`);
      const blob = await response.blob();
      console.log(`📦 Video blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

      console.log(`☁️ Uploading video to Firebase Storage: ${path}`);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);

      console.log(`🔗 Getting video download URL...`);
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Uploaded video: ${path}`);
      return downloadURL;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Video fetch timeout - please try with a smaller video or check your connection');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ Error uploading video ${path}:`, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      uri: uri.substring(0, 100)
    });
    throw error;
  }
}

/**
 * Fetch listings from Firestore (WEB VERSION)
 */
export async function fetchListings(categoryFilter = null, limitCount = 20) {
  try {
    const expandedIds = expandCategoryIds(categoryFilter);

    let q;
    if (expandedIds && expandedIds.length === 1) {
      q = query(
        collection(firestore, "listings"),
        where("categoryId", "==", expandedIds[0]),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    } else if (expandedIds && expandedIds.length > 1) {
      q = query(
        collection(firestore, "listings"),
        where("categoryId", "in", expandedIds.slice(0, 10)),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    } else {
      q = query(
        collection(firestore, "listings"),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    }

    // Force fetch from server to bypass cache and get latest data
    console.log('📡 Fetching listings from server (bypassing cache)...');
    const snapshot = await getDocsFromServer(q);
    console.log('✅ Fetched', snapshot.docs.length, 'listings from server');

    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter for active listings (or listings without status field) in-memory
    const activeListings = listings.filter(listing =>
      listing.status === 'active' || !listing.status
    );

    return activeListings;
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    throw error;
  }
}

/**
 * Get single listing by ID (WEB VERSION)
 */
export async function getListingById(listingId) {
  try {
    // Force fetch from server to get latest data (important for images!)
    console.log('📡 Fetching listing from server, ID:', listingId);
    const docSnap = await getDocFromServer(doc(firestore, "listings", listingId));
    console.log('✅ Fetched listing, has images:', docSnap.exists() && docSnap.data().images?.length > 0);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Listing images count:', data.images?.length || 0);
      return { id: docSnap.id, ...data };
    } else {
      throw new Error("Listing not found");
    }
  } catch (error) {
    console.error("❌ Error getting listing:", error);
    throw error;
  }
}

/**
 * Get user's listings (WEB VERSION)
 */
export async function getUserListings(userId) {
  try {
    const q = query(
      collection(firestore, "listings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    // Force fetch from server to get latest data
    console.log('📡 Fetching user listings from server for userId:', userId);
    const snapshot = await getDocsFromServer(q);
    console.log('✅ Fetched', snapshot.docs.length, 'user listings from server');

    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return listings;
  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    throw error;
  }
}

/**
 * Update listing (WEB VERSION)
 */
export async function updateListing(listingId, updates) {
  try {
    await updateDoc(doc(firestore, "listings", listingId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Listing updated: ${listingId}`);
  } catch (error) {
    console.error("❌ Error updating listing:", error);
    throw error;
  }
}

/**
 * Delete listing (WEB VERSION)
 */
export async function deleteListing(listingId) {
  try {
    const listing = await getListingById(listingId);

    // Delete images from storage
    if (listing.images && listing.images.length > 0) {
      const deletePromises = listing.images.map(imageUrl => {
        try {
          const decodedPath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
          const imageRef = ref(storage, decodedPath);
          return deleteObject(imageRef);
        } catch (e) {
          console.warn('Failed to delete image:', e);
          return Promise.resolve();
        }
      });
      await Promise.all(deletePromises);
    }

    // Delete video from storage
    if (listing.videoUrl) {
      try {
        const decodedPath = decodeURIComponent(listing.videoUrl.split('/o/')[1].split('?')[0]);
        const videoRef = ref(storage, decodedPath);
        await deleteObject(videoRef);
        console.log(`✅ Deleted video for listing: ${listingId}`);
      } catch (e) {
        console.warn('Failed to delete video:', e);
      }
    }

    // Delete listing document
    await deleteDoc(doc(firestore, "listings", listingId));
    console.log(`✅ Listing deleted: ${listingId}`);
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    throw error;
  }
}

/**
 * Mark listing as sold (WEB VERSION)
 */
export async function markListingAsSold(listingId) {
  try {
    await updateDoc(doc(firestore, "listings", listingId), {
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
 * Reactivate a sold listing (WEB VERSION)
 */
export async function reactivateListing(listingId) {
  try {
    await updateDoc(doc(firestore, "listings", listingId), {
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
 * Increment listing view count (WEB VERSION)
 */
export async function incrementListingViews(listingId) {
  try {
    await updateDoc(doc(firestore, "listings", listingId), {
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
 * Get single listing by ID (alias for consistency)
 */
export async function getListing(listingId) {
  return getListingById(listingId);
}

/**
 * Search listings (WEB VERSION)
 */
export async function searchListings(searchText = "", category = null, minPrice = null, maxPrice = null, subcategoryId = null, userLocation = null) {
  try {
    console.log('searchListings called with:', { searchText, category, subcategoryId, userLocation });

    // Only fetch active listings for marketplace
    const listings = await fetchListings(category, 50);

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

    // Apply price range filter
    if (minPrice !== null && minPrice !== '') {
      activeListings = activeListings.filter(listing => listing.price >= parseFloat(minPrice));
    }
    if (maxPrice !== null && maxPrice !== '') {
      activeListings = activeListings.filter(listing => listing.price <= parseFloat(maxPrice));
    }

    // Apply location filter if provided
    if (userLocation && userLocation.city) {
      console.log(`Filtering by location: ${userLocation.city}, ${userLocation.state}`);
      activeListings = activeListings.filter(listing => {
        // Include listings without location (graceful degradation)
        if (!listing.location) return true;

        const listingLocation = listing.location.toLowerCase();
        const userCity = userLocation.city.toLowerCase();
        const userState = userLocation.state?.toLowerCase() || '';
        const userCountry = userLocation.country?.toLowerCase() || '';

        // Match if listing contains city, state, or country
        const matches = listingLocation.includes(userCity) ||
                       listingLocation.includes(userState) ||
                       listingLocation.includes(userCountry);

        if (matches) {
          console.log(`Location match: ${listing.title} at ${listing.location}`);
        }
        return matches;
      });
      console.log(`After location filter: ${activeListings.length} listings`);
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
 * Subscribe to real-time listings updates (WEB VERSION)
 * Returns unsubscribe function
 */
export function subscribeToListings(callback, categoryFilter = null, limitCount = 20) {
  try {
    const expandedIds = expandCategoryIds(categoryFilter);

    let q;
    if (expandedIds && expandedIds.length === 1) {
      q = query(
        collection(firestore, "listings"),
        where("categoryId", "==", expandedIds[0]),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    } else if (expandedIds && expandedIds.length > 1) {
      q = query(
        collection(firestore, "listings"),
        where("categoryId", "in", expandedIds.slice(0, 10)),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    } else {
      q = query(
        collection(firestore, "listings"),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    }

    console.log('🔴 Setting up real-time listener for listings...');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔴 Real-time update received:', snapshot.docs.length, 'listings');
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter for active listings
      const activeListings = listings.filter(listing =>
        listing.status === 'active' || !listing.status
      );

      callback(activeListings);
    }, (error) => {
      console.error("❌ Error in listings listener:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up listings listener:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time user listings updates (WEB VERSION)
 * Returns unsubscribe function
 */
export function subscribeToUserListings(userId, callback) {
  try {
    const q = query(
      collection(firestore, "listings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    console.log('🔴 Setting up real-time listener for user listings:', userId);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔴 Real-time update received:', snapshot.docs.length, 'user listings');
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback(listings);
    }, (error) => {
      console.error("❌ Error in user listings listener:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up user listings listener:", error);
    throw error;
  }
}
