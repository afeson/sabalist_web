/**
 * Web-specific Firebase Firestore & Storage operations for listings
 * Uses Firebase Web SDK
 */

import { firestore, storage } from "../lib/firebase.web";
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, where, getDocs, orderBy, limit as firestoreLimit, deleteDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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

    const listingRef = await addDoc(collection(firestore, "listings"), {
      title: listingData.title,
      description: listingData.description || "",
      price: parseFloat(listingData.price) || 0,
      currency: listingData.currency || "USD",
      category: listingData.category || "General",
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
    await updateDoc(doc(firestore, "listings", listingId), {
      images: imageUrls,
      coverImage: imageUrls[0] || "",
      videoUrl: videoUrl,
      updatedAt: serverTimestamp()
    });

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
    console.log(`📤 Fetching image from URI: ${uri.substring(0, 50)}...`);

    // Create AbortController for fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for fetch

    try {
      const response = await fetch(uri, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`📦 Converting to blob...`);
      const blob = await response.blob();
      console.log(`📦 Blob size: ${(blob.size / 1024).toFixed(2)} KB`);

      console.log(`☁️ Uploading to Firebase Storage: ${path}`);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);

      console.log(`🔗 Getting download URL...`);
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Upload complete: ${path}`);
      return downloadURL;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Image fetch timeout - please try with a smaller image or check your connection');
      }
      throw fetchError;
    }
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
    let q = query(
      collection(firestore, "listings"),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitCount)
    );

    if (categoryFilter && categoryFilter !== "All") {
      q = query(
        collection(firestore, "listings"),
        where("category", "==", categoryFilter),
        orderBy("createdAt", "desc"),
        firestoreLimit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
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
    const docSnap = await getDoc(doc(firestore, "listings", listingId));

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
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

    const snapshot = await getDocs(q);
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
export async function searchListings(searchText = "", category = null, minPrice = null, maxPrice = null, subcategoryId = null) {
  try {
    console.log('searchListings called with:', { searchText, category, subcategoryId });

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
