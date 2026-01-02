/**
 * Native-specific Firebase Firestore & Storage operations for listings
 * Uses React Native Firebase SDK (@react-native-firebase)
 */

import { firestore, storage } from "../lib/firebase";

/**
 * Create a new listing in Firestore (NATIVE VERSION)
 * @param {Object} listingData - { title, description, price, category, currency, location, userId }
 * @param {Array} imageUris - Array of local image URIs to upload (up to 30)
 * @returns {Promise<string>} - Document ID
 */
export async function createListing(listingData, imageUris = []) {
  try {
    // Create listing document first to get listingId
    const listingRef = await firestore().collection("listings").add({
      title: listingData.title,
      description: listingData.description || "",
      price: parseFloat(listingData.price) || 0,
      currency: listingData.currency || "USD",
      category: listingData.category || "General",
      location: listingData.location || "Africa",
      phoneNumber: listingData.phoneNumber || "",
      userId: listingData.userId,
      images: [], // Will be updated after upload
      coverImage: "", // Will be set to first image
      status: "active",
      views: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });

    const listingId = listingRef.id;
    console.log(`✅ Listing created: ${listingId}`);

    // Upload images in parallel to listingId-specific folder
    let imageUrls = [];

    if (imageUris.length > 0) {
      console.log(`📤 Uploading ${imageUris.length} images in parallel...`);

      // Upload all images in parallel for speed
      const uploadPromises = imageUris.map((uri, index) =>
        uploadImage(uri, `listings/${listingId}/image-${index}-${Date.now()}.jpg`)
      );

      imageUrls = await Promise.all(uploadPromises);
      console.log(`✅ Uploaded ${imageUrls.length} images`);

      // Update listing with image URLs
      await firestore().collection("listings").doc(listingId).update({
        images: imageUrls,
        coverImage: imageUrls[0] || "", // First image is cover
        updatedAt: firestore.FieldValue.serverTimestamp()
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
 * Fetch listings from Firestore (NATIVE VERSION)
 * @param {Object} options - { category, maxResults }
 * @returns {Promise<Array>} - Array of listings
 */
export async function fetchListings({ category = null, maxResults = 50 } = {}) {
  try {
    let query = firestore()
      .collection("listings")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(maxResults);

    if (category && category !== "All") {
      query = firestore()
        .collection("listings")
        .where("category", "==", category)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(maxResults);
    }

    const snapshot = await query.get();

    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Fetched ${listings.length} listings`);
    return listings;
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    throw error;
  }
}

/**
 * Search listings by text (only active listings) (NATIVE VERSION)
 * @param {string} searchText - Search query
 * @param {string} category - Category filter
 * @param {number} minPrice - Minimum price filter
 * @param {number} maxPrice - Maximum price filter
 * @returns {Promise<Array>} - Filtered listings
 */
export async function searchListings(searchText = "", category = null, minPrice = null, maxPrice = null) {
  try {
    // Only fetch active listings for marketplace
    const listings = await fetchListings({ category });

    // Filter out sold listings for marketplace display
    let activeListings = listings.filter(listing => listing.status === 'active' || !listing.status);

    // Apply price range filter
    if (minPrice !== null && minPrice !== '') {
      activeListings = activeListings.filter(listing => listing.price >= parseFloat(minPrice));
    }
    if (maxPrice !== null && maxPrice !== '') {
      activeListings = activeListings.filter(listing => listing.price <= parseFloat(maxPrice));
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
 * Get a single listing by ID (NATIVE VERSION)
 * @param {string} listingId - Listing document ID
 * @returns {Promise<Object>} - Listing data with id
 */
export async function getListing(listingId) {
  try {
    const docSnap = await firestore().collection("listings").doc(listingId).get();

    if (!docSnap.exists) {
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
 * Get listings for a specific user (NATIVE VERSION)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user's listings
 */
export async function getUserListings(userId) {
  try {
    const snapshot = await firestore()
      .collection("listings")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Fetched ${listings.length} listings for user ${userId}`);
    return listings;
  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    throw error;
  }
}

/**
 * Update an existing listing (NATIVE VERSION)
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
      coverImage: allImages[0] || "", // First image is always cover
      updatedAt: firestore.FieldValue.serverTimestamp()
    };

    await firestore().collection("listings").doc(listingId).update(updates);
    console.log(`✅ Listing updated: ${listingId} with ${allImages.length} images`);
  } catch (error) {
    console.error("❌ Error updating listing:", error);
    throw error;
  }
}

/**
 * Mark listing as sold (NATIVE VERSION)
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function markListingAsSold(listingId) {
  try {
    await firestore().collection("listings").doc(listingId).update({
      status: 'sold',
      soldAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Listing marked as sold: ${listingId}`);
  } catch (error) {
    console.error("❌ Error marking listing as sold:", error);
    throw error;
  }
}

/**
 * Reactivate a sold listing (NATIVE VERSION)
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function reactivateListing(listingId) {
  try {
    await firestore().collection("listings").doc(listingId).update({
      status: 'active',
      soldAt: null,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Listing reactivated: ${listingId}`);
  } catch (error) {
    console.error("❌ Error reactivating listing:", error);
    throw error;
  }
}

/**
 * Increment listing view count (NATIVE VERSION)
 * @param {string} listingId - Listing document ID
 * @returns {Promise<void>}
 */
export async function incrementListingViews(listingId) {
  try {
    await firestore().collection("listings").doc(listingId).update({
      views: firestore.FieldValue.increment(1),
      lastViewedAt: firestore.FieldValue.serverTimestamp()
    });
    console.log(`👁️ View counted for listing: ${listingId}`);
  } catch (error) {
    // Fail silently - views are not critical
    console.warn("⚠️ Could not increment views:", error.message);
  }
}

/**
 * Delete a listing and its images from storage (NATIVE VERSION)
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
    await firestore().collection("listings").doc(listingId).delete();

    console.log(`✅ Listing deleted: ${listingId}`);
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    throw error;
  }
}
