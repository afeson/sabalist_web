# Debugging Listing Creation 404 Error

## Error Message

```
POST listing is not working
Failed to load resource: the server responded with a status of 404 ()
```

## What This Means

A 404 error during listing creation typically means:
- ❌ A resource (image, file, or API endpoint) cannot be found
- ❌ Not necessarily that the listing creation failed

---

## Step-by-Step Debugging

### 1. Open Browser Console

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+I`
- Click the "Console" tab

**Safari:**
- Press `Cmd+Option+C`
- Click "Console"

### 2. Clear Console

Click the "Clear console" button (🚫 icon)

### 3. Attempt to Create a Listing

1. Fill out all listing details
2. Add 1-2 images
3. Click "Post" button
4. Watch the console carefully

### 4. Check Console Output

Look for these log messages (we added detailed logging):

```
📝 Creating listing with data: {title: "...", category: "..."}
✅ Listing created in Firestore: abc123xyz
📤 Uploading 2 images...
📤 Fetching image from URI: blob:http://...
📦 Converting to blob...
📦 Blob size: 245.67 KB
☁️ Uploading to Firebase Storage: listings/abc123/image-0...
🔗 Getting download URL...
✅ Upload complete: listings/abc123/image-0...
✅ Uploaded 2 out of 2 images
📝 Updating listing with media URLs...
✅ Listing abc123 completed successfully!
```

### 5. Identify the 404 Error

In the console, look for:

**Red text errors like:**
```
GET https://sabalist.com/some-missing-file.jpg 404 (Not Found)
POST https://firebasestorage.googleapis.com/... 404 (Not Found)
Failed to load resource: the server responded with a status of 404
```

**Look at the URL that's failing:**
- If it's a `firebasestorage.googleapis.com` URL → Firebase Storage issue
- If it's a `firestore.googleapis.com` URL → Firestore issue
- If it's a `sabalist.com` URL → Missing static resource
- If it's a blob URL → Image upload issue

---

## Common Causes & Solutions

### Issue 1: Firebase Storage 404

**Error:**
```
POST https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
404 (Not Found)
```

**Cause:** Storage bucket URL is incorrect

**Solution:** Check Firebase config in `.env`:
```
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=sabalist.firebasestorage.app
```

### Issue 2: Image Upload 404

**Error:**
```
❌ Failed to upload image 0: Error: HTTP 404: Not Found
```

**Cause:** Firebase Storage bucket doesn't exist or wrong URL

**Solution:**
1. Go to Firebase Console → Storage
2. Verify bucket exists: `sabalist.firebasestorage.app`
3. Check storage rules allow uploads

### Issue 3: Missing PWA Asset

**Error:**
```
GET https://sabalist.com/pwa/apple-touch-startup-image/apple-touch-startup-image-640x1136.png
404 (Not Found)
```

**Cause:** Missing PWA splash screen image

**Solution:** This is harmless - doesn't affect listing creation

### Issue 4: Source Map 404

**Error:**
```
GET https://sabalist.com/static/js/main.64df5992.js.map
404 (Not Found)
```

**Cause:** Source maps not deployed

**Solution:** This is harmless - only used for debugging

---

## Check if Listing Was Actually Created

Even if you see a 404 error, the listing might have been created successfully!

### Method 1: Check Firestore

1. Go to Firebase Console → Firestore Database
2. Look at `listings` collection
3. Check if your listing appears (sorted by `createdAt`)

### Method 2: Check App Home Screen

1. Navigate to Home screen
2. Pull to refresh
3. Look for your listing

### Method 3: Check Your Listings

1. Tap Profile tab
2. Check "My Listings"
3. See if your listing appears

---

## Detailed Error Information

### What to Look For:

1. **Exact URL that failed**
   - Copy the full URL from the error
   - This tells us what resource is missing

2. **Error code**
   - 404 = Not Found
   - 403 = Forbidden (permissions issue)
   - 500 = Server error

3. **Stack trace**
   - Shows which code triggered the error
   - Look for file names like `listings.web.js:123`

4. **Request payload**
   - What data was being sent
   - Click on the failed request in Network tab

---

## Network Tab Debugging

### 1. Open Network Tab

- Press F12
- Click "Network" tab
- Check "Preserve log" checkbox

### 2. Filter Requests

- Click "All" to see everything
- Or filter by "XHR" to see API calls

### 3. Create a Listing

Watch for:
- Red (failed) requests
- Status code column
- Look for 404 errors

### 4. Click Failed Request

**See details:**
- Headers tab → Request URL
- Preview tab → Error message
- Response tab → Server response

---

## Most Likely Scenarios

### Scenario 1: Listing Created Successfully, 404 is Unrelated

**Symptoms:**
- Success alert shows
- Listing appears on Home screen
- But console shows 404

**Cause:** Missing PWA asset or source map

**Solution:** Ignore - listing creation works

### Scenario 2: Firebase Storage Upload Failed

**Symptoms:**
- Spinner keeps spinning
- No success alert
- Console shows Firebase 404

**Cause:** Wrong storage bucket URL

**Solution:** Check `.env` file:
```
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=sabalist.firebasestorage.app
```

### Scenario 3: Firestore Write Failed

**Symptoms:**
- Error alert shows
- Console shows "Error creating listing"
- Firestore 404 or 403

**Cause:** Security rules or wrong project ID

**Solution:** Check `.env` file:
```
EXPO_PUBLIC_FIREBASE_PROJECT_ID=sabalist
```

---

## Quick Test

### Create a Test Listing:

1. **Open Console** (F12)
2. **Clear console**
3. **Fill listing form:**
   - Title: "Test Listing"
   - Category: Electronics
   - Subcategory: Phones
   - Price: 100
   - Description: "Test"
   - Location: "Nairobi"
   - Phone: "+254712345678"
4. **Add 1 image** (any image)
5. **Click "Post"**
6. **Watch console carefully**

### Expected Output:

```
📝 Creating listing with data: {title: "Test Listing", ...}
✅ Listing created in Firestore: xyz123
📤 Uploading 1 images...
📤 Fetching image from URI: blob:...
📦 Converting to blob...
📦 Blob size: 125.34 KB
☁️ Uploading to Firebase Storage: listings/xyz123/image-0...
🔗 Getting download URL...
✅ Upload complete!
✅ Uploaded 1 out of 1 images
📝 Updating listing with media URLs...
✅ Listing xyz123 completed successfully!
```

### If You See:

**All ✅ checkmarks** → Listing created successfully (ignore any 404s from other resources)

**❌ Error messages** → Copy the FULL error and check which step failed

---

## Report Back

If the listing is still not working, provide:

1. **Exact console output** (copy all messages)
2. **Failed URL** (the resource that returned 404)
3. **Whether listing appears in:**
   - Firebase Console → Firestore
   - App Home screen
   - Profile → My Listings

---

## Firebase Console Check

### 1. Go to Firebase Console

https://console.firebase.google.com/project/sabalist

### 2. Check Firestore

- Click "Firestore Database"
- Look at `listings` collection
- Check if test listing exists

### 3. Check Storage

- Click "Storage"
- Look for `listings/{listingId}/` folder
- Check if images uploaded

### 4. Check Authentication

- Click "Authentication"
- Verify you're signed in
- Check UID matches listing userId

---

## Common 404 URLs (Harmless)

These 404s are safe to ignore:

```
/pwa/apple-touch-startup-image/apple-touch-startup-image-*.png
/static/js/*.js.map
/favicon-*.png (if missing)
/robots.txt
/sitemap.xml
```

These DON'T affect listing creation.

---

## Real Issues to Watch For

These 404s ARE problems:

```
https://firebasestorage.googleapis.com/.../listings/...
https://firestore.googleapis.com/...
https://sabalist.firebaseapp.com/...
https://identitytoolkit.googleapis.com/...
```

These indicate Firebase connectivity issues.

---

## Next Steps

1. **Open browser console**
2. **Attempt to create a listing**
3. **Copy console output** (all of it)
4. **Check if listing appears** in Firestore or app
5. **Report findings** with exact error messages

The detailed logging we added will show exactly where the process fails!
