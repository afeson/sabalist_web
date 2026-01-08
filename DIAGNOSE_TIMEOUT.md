# Diagnose Upload Timeout Issue

## You're Getting This Error:
```
❌ Error in handleSubmit: Error: Request timeout. Please check your internet connection and try again.
```

This means the upload is **taking longer than 2 minutes**, but we need to know **WHERE** it's getting stuck.

---

## Step 1: Open Browser Console

1. Press **F12** (or Ctrl+Shift+I)
2. Click **"Console"** tab
3. Click the **trash icon** 🗑️ to clear old logs

---

## Step 2: Scroll Up and Find All Emoji Logs

Look for messages with emojis **BEFORE** the timeout error. Copy ALL messages you see with these emojis:

### Expected Log Sequence:

```
📝 Creating listing with data: {...}
✅ Listing created in Firestore: abc123
📤 Uploading 3 images...
📤 Fetching image from URI: blob:http://...
📦 Converting to blob...
📦 Blob size: 245.67 KB
☁️ Uploading to Firebase Storage: listings/abc123/image-0...
🔗 Getting download URL...
✅ Upload complete: listings/abc123/image-0
📤 Fetching image from URI: blob:http://...
📦 Converting to blob...
📦 Blob size: 512.34 KB
☁️ Uploading to Firebase Storage: listings/abc123/image-1...
[... THIS IS WHERE IT MIGHT HANG ...]
```

---

## Step 3: Identify Where It Stops

**Find the LAST emoji message** before the timeout. Tell me which one:

### Scenario A: Stops at "📝 Creating listing with data:"
**Problem:** Can't write to Firestore
**Cause:** Permission denied or network issue
**Fix:** Check Firebase authentication status

### Scenario B: Stops at "✅ Listing created in Firestore:"
**Problem:** Can't start image uploads
**Cause:** Images array is empty or malformed
**Fix:** Check if images were selected properly

### Scenario C: Stops at "📤 Uploading N images..."
**Problem:** Can't fetch image blob
**Cause:** Image URI expired or CORS issue
**Fix:** Reduce timeout or use different image source

### Scenario D: Stops at "📦 Blob size: X KB"
**Problem:** Can't upload to Firebase Storage
**Cause:** Storage bucket URL wrong, or permission denied
**Fix:** Verify Firebase Storage configuration

### Scenario E: Stops at "☁️ Uploading to Firebase Storage:"
**Problem:** Upload is hanging mid-transfer
**Cause:** Image too large or very slow network
**Fix:** Use smaller images or better connection

### Scenario F: Stops at "🔗 Getting download URL..."
**Problem:** Upload succeeded but can't get URL
**Cause:** Storage permission issue
**Fix:** Check Firebase Storage rules

### Scenario G: Stops at "📝 Updating listing with media URLs..."
**Problem:** Can't update Firestore with image URLs
**Cause:** Firestore permission denied on update
**Fix:** Firestore rules need media field update permission

---

## Step 4: Check Image Sizes

In the console logs, look for `📦 Blob size:` messages. If you see sizes like:

- ✅ `245.67 KB` - Good size
- ✅ `512.34 KB` - Good size
- ✅ `1.2 MB` - OK size
- ⚠️ `5.8 MB` - Large, might be slow
- ❌ `8.9 MB` - Too large, will timeout

**If all images are > 5MB**, that's the problem. The timeout is happening because:
- 5 images × 8MB each = 40MB total
- On slow network (2 Mbps) = ~3 minutes to upload
- Timeout is 2 minutes → fails

---

## Step 5: Check Network Tab

1. In DevTools, click **"Network"** tab
2. Check **"Preserve log"** checkbox
3. Try creating listing again
4. Look for **red (failed)** requests

**Common failing URLs:**

### ❌ `https://firebasestorage.googleapis.com/... → 403`
**Problem:** Storage permission denied
**Fix:** Check Firebase Storage rules

### ❌ `https://firebasestorage.googleapis.com/... → 404`
**Problem:** Wrong storage bucket URL
**Fix:** Verify `.env` has correct `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`

### ❌ `blob:http://localhost:... → (pending)`
**Problem:** Image fetch hanging
**Fix:** Image URI expired or invalid

---

## Quick Fixes to Try

### Fix 1: Try With Just 1 Small Image

1. Create new listing
2. Add **ONLY 1 image** (< 500KB)
3. Try posting

**If this works:**
- ✅ Problem is image size/quantity
- Solution: Compress images before upload OR increase timeout

**If this still times out:**
- ❌ Problem is configuration (Firestore/Storage)
- Need to check Firebase setup

---

### Fix 2: Check Firebase Authentication

Paste this in console:

```javascript
firebase.auth().currentUser
```

**Expected:** Should show user object with `uid`

**If `null`:**
- You're not signed in
- Sign out and sign in again

---

### Fix 3: Check Storage Bucket URL

Paste this in console:

```javascript
console.log(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET)
```

**Expected:** `sabalist.firebasestorage.app`

**If `undefined` or different:**
- Hard refresh: Ctrl+Shift+R
- Clear cache completely
- Try incognito mode

---

## What I Need From You

Please copy and paste:

1. **All console messages with emojis** (📝, ✅, ❌, 📤, etc.)
2. **The LAST emoji message** before timeout
3. **All blob sizes** you see (📦 Blob size: X KB)
4. **How many images** you tried to upload
5. **Any red (failed) requests** in Network tab

With this info, I can pinpoint the exact bottleneck and fix it.

---

## Temporary Workaround

While we debug, you can:

1. **Use smaller images:**
   - Take photos with lower quality
   - Or compress images first using online tool

2. **Upload fewer images:**
   - Just 1-2 images for now
   - Add more later via "Edit Listing"

3. **Try without images:**
   - Skip adding photos
   - Create text-only listing to test if Firestore write works

---

## Expected Upload Times

**Normal conditions (10 Mbps network):**
- 1 image (500KB): 5-10 seconds
- 3 images (1.5MB total): 15-20 seconds
- 5 images (2.5MB total): 25-35 seconds

**Slow network (2 Mbps):**
- 1 image (500KB): 10-15 seconds
- 3 images (1.5MB total): 40-60 seconds
- 5 images (2.5MB total): 90-120 seconds ⚠️ **Close to timeout!**

**Very slow network (1 Mbps or less):**
- Will timeout with multiple images

---

## Next Steps

1. **Copy all console logs** (scroll up to find emoji logs)
2. **Share the LAST emoji** before timeout
3. **Share image blob sizes** if you see them
4. I'll tell you exactly what's failing and how to fix it
