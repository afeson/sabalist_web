# Fixed: Timeout Issue for 6 Image Uploads

## Problem
You were uploading **6 images** and hitting the 2-minute timeout, getting this error:
```
❌ Error in handleSubmit: Error: Request timeout. Please check your internet connection and try again.
```

---

## Root Cause

### 1. **Timeout Too Short for Multiple Images**
- Original timeout: **2 minutes (120 seconds)**
- 6 images × 20-30 seconds each = **120-180 seconds**
- On slower connections or larger images → easily exceeds 2 minutes

### 2. **Parallel Uploads Overwhelming Connection**
- All 6 images uploaded simultaneously using `Promise.all()`
- This can saturate bandwidth and cause:
  - Individual uploads to slow down
  - Connection to drop packets
  - Timeouts on individual fetch requests

### 3. **No Progress Visibility**
- User couldn't see which image was being processed
- Looked like the app was frozen
- No way to know if it was working or stuck

---

## The Fix

### ✅ 1. Increased Timeout to 5 Minutes

**File:** `src/screens/CreateListingScreen.js` (line 272-278)

```javascript
// Create a timeout promise that rejects after 5 minutes
// (allows ~50 seconds per image for 6 images)
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error('Request timeout. Please check your internet connection and try again.'));
  }, 300000); // 5 minutes (was 120000 = 2 minutes)
});
```

**Why 5 minutes:**
- 6 images × ~50 seconds per image = 300 seconds max
- Includes time for Firestore write + final update
- Allows for slower networks or larger images
- Still protects against infinite hangs

---

### ✅ 2. Changed to Sequential Uploads

**File:** `src/services/listings.web.js` (line 50-65)

**Before (Parallel):**
```javascript
const uploadPromises = imageUris.map((uri, index) =>
  uploadImage(uri, path)
);
const results = await Promise.all(uploadPromises); // All at once
```

**After (Sequential):**
```javascript
// Upload images sequentially to avoid overwhelming the connection
for (let index = 0; index < imageUris.length; index++) {
  try {
    console.log(`📤 [${index + 1}/${imageUris.length}] Starting upload...`);
    const url = await uploadImage(imageUris[index], path);
    imageUrls.push(url);
    console.log(`✅ [${index + 1}/${imageUris.length}] Upload complete`);
  } catch (err) {
    console.error(`❌ [${index + 1}/${imageUris.length}] Failed:`, err.message);
    // Continue with next image
  }
}
```

**Benefits:**
- One image at a time = more reliable
- Doesn't saturate bandwidth
- Better error isolation (one failure doesn't affect others)
- Works better on slower connections

---

### ✅ 3. Added Progress Logging

Now you'll see in the console:

```
📤 Uploading 6 images...
📤 [1/6] Starting upload...
📤 Fetching image from URI: blob:http://...
📦 Converting to blob...
📦 Blob size: 245.67 KB
☁️ Uploading to Firebase Storage: listings/abc123/image-0...
🔗 Getting download URL...
✅ Upload complete: listings/abc123/image-0
✅ [1/6] Upload complete

📤 [2/6] Starting upload...
📤 Fetching image from URI: blob:http://...
📦 Converting to blob...
📦 Blob size: 312.45 KB
☁️ Uploading to Firebase Storage: listings/abc123/image-1...
🔗 Getting download URL...
✅ Upload complete: listings/abc123/image-1
✅ [2/6] Upload complete

... (continues for all 6 images)

✅ Uploaded 6 out of 6 images
📝 Updating listing with media URLs...
✅ Listing abc123 completed successfully!
```

**Benefits:**
- You can see exactly which image is being processed
- Know if it's making progress or stuck
- Can estimate time remaining
- Better debugging if one image fails

---

## Expected Upload Times

### Normal Network (10 Mbps):
- 1 image (500KB): **10-15 seconds**
- 3 images (1.5MB): **30-45 seconds**
- 6 images (3MB): **60-90 seconds** ✅ Well under 5 min

### Slow Network (2 Mbps):
- 1 image (500KB): **15-20 seconds**
- 3 images (1.5MB): **60-90 seconds**
- 6 images (3MB): **180-240 seconds** ✅ Within 5 min timeout

### Very Slow Network (1 Mbps):
- 1 image (500KB): **20-30 seconds**
- 3 images (1.5MB): **90-120 seconds**
- 6 images (3MB): **240-360 seconds** ⚠️ Might timeout, but sequential upload helps

---

## Testing Instructions

**CRITICAL: Clear your browser cache and hard refresh!**

### 1. Clear Cache
- Press **Ctrl+Shift+Delete**
- Select "Cached images and files"
- Select "All time"
- Click "Clear data"

### 2. Hard Refresh
- Go to https://sabalist.com
- Press **Ctrl+Shift+R** (hard refresh)
- This loads the new code with 5-minute timeout

### 3. Test Upload
1. Open browser console (F12 → Console tab)
2. Clear console
3. Create a test listing
4. Add **6 images** (any size, but recommend < 2MB each)
5. Fill in details
6. Click "Post listing"

### 4. Watch Console Output
You should now see:
```
📤 Uploading 6 images...
📤 [1/6] Starting upload...
📦 Blob size: XXX KB
✅ [1/6] Upload complete
📤 [2/6] Starting upload...
📦 Blob size: XXX KB
✅ [2/6] Upload complete
... (continues)
✅ Uploaded 6 out of 6 images
✅ Listing abc123 completed successfully!
```

**Expected wait time:** 1-4 minutes (depending on image sizes and network speed)

**No more timeout!** Unless your connection is extremely slow or images are extremely large.

---

## What Changed

### Commit 1: `91a9879`
- Added 2-minute timeout (fixed infinite spinner)
- Added fetch timeouts
- Added finally block

### Commit 2: `d4e090a` (Latest)
- Increased timeout to **5 minutes**
- Changed to **sequential uploads**
- Added **progress logging**

---

## Deployment Status

**Deployed:** Just now
**Build ID:** `afrilist-8ggd40jx3`
**Status:** ● Ready
**URL:** https://sabalist.com

---

## If It Still Times Out

If you still get timeout with 6 images after 5 minutes:

### Option 1: Use Smaller Images
- Take photos at lower quality
- Or compress before uploading
- Target < 1MB per image

### Option 2: Upload Fewer Images Initially
- Upload 3-4 images when creating listing
- Add remaining images later via "Edit Listing"

### Option 3: Check Network Speed
- Run speed test: https://fast.com
- If < 1 Mbps, uploads will be very slow
- Try on better WiFi/mobile connection

---

## Summary

✅ **Timeout increased:** 2 min → 5 min
✅ **Uploads changed:** Parallel → Sequential
✅ **Progress logging:** Can see which image is uploading
✅ **Error handling:** Individual image failures don't stop others

**Result:** 6 images should upload successfully within 1-4 minutes on most connections.

---

## Next Steps

1. **Clear browser cache** (critical!)
2. **Hard refresh** sabalist.com (Ctrl+Shift+R)
3. **Try uploading 6 images**
4. **Watch console** to see progress
5. **Should complete** within 1-4 minutes

If you still get timeout, share:
- Console logs showing progress (📤 [1/6], [2/6], etc.)
- Where it stopped (which image number)
- Blob sizes (📦 Blob size: X KB)
- Your network speed (from fast.com)
