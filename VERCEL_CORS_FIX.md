# 🔥 REAL FIX: Firebase Storage CORS for Vercel

## ✅ Root Cause Identified

**The actual problem:** Firebase Storage is blocking image uploads from **sabalist.com** (Vercel) due to CORS restrictions.

**Why Amplify works:** Your AWS Amplify domain is likely already whitelisted in Firebase Storage CORS, or you haven't tested uploads there recently.

**Why Vercel fails:** `sabalist.com` and `*.vercel.app` domains are NOT in Firebase Storage's CORS whitelist, so image uploads get blocked.

---

## 🎯 The Three-Part Fix

### Part 1: Configure Firebase Storage CORS ⭐ **CRITICAL**

This is the main fix that will make uploads work.

#### Option A: Using Google Cloud Console (Recommended - No CLI needed)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/storage/browser
   - Select project: **sabalist**

2. **Find your Storage bucket:**
   - Look for: `sabalist.firebasestorage.app` or `sabalist.appspot.com`
   - Click on the bucket name

3. **Configure CORS:**
   - Click the **"Permissions"** tab
   - Scroll to **"CORS configuration"**
   - Click **"Edit CORS configuration"**
   - Paste this JSON:

```json
[
  {
    "origin": [
      "https://sabalist.com",
      "https://www.sabalist.com",
      "https://afrilist-mvp.vercel.app",
      "https://*.vercel.app",
      "http://localhost:19006"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

4. **Save and wait 2-3 minutes** for changes to propagate

#### Option B: Using gsutil Command Line

If you have `gsutil` installed:

```bash
# Apply the CORS configuration
gsutil cors set cors.json gs://sabalist.firebasestorage.app
```

The `cors.json` file has already been created in your project root.

To verify it was applied:
```bash
gsutil cors get gs://sabalist.firebasestorage.app
```

---

### Part 2: Add Vercel Domain to Firebase Authorized Domains

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select project: **sabalist**

2. **Navigate to Authentication:**
   - Click **Authentication** in left sidebar
   - Click **Settings** tab
   - Click **Authorized domains**

3. **Add these domains:**
   ```
   sabalist.com
   www.sabalist.com
   afrilist-mvp.vercel.app
   ```

   Click **Add domain** for each one.

---

### Part 3: Add Vercel Environment Variables (If Not Done Already)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables

2. **Add all 7 Firebase variables** (if not already added):

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `sabalist.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `sabalist` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `sabalist.firebasestorage.app` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `231273918004` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:231273918004:web:0020dcc14b7f52e3356461` |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-LGGRMQBGSD` |

3. **Check all environment types:** Production, Preview, Development

4. **Redeploy** after adding variables

---

## 🔍 How to Verify the Fix

### Step 1: Check CORS Configuration

After applying CORS config, test it:

```bash
# Test CORS headers
curl -H "Origin: https://sabalist.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/test
```

**Expected response headers:**
```
Access-Control-Allow-Origin: https://sabalist.com
Access-Control-Allow-Methods: GET, HEAD, PUT, POST, DELETE
```

### Step 2: Test Create Listing

1. Visit https://sabalist.com
2. Open browser console (F12) and go to **Network** tab
3. Try creating a listing with images
4. Watch the network requests

**Look for these requests:**

#### ✅ Success Pattern:
```
POST https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
Status: 200 OK
Response Headers:
  Access-Control-Allow-Origin: https://sabalist.com
```

#### ❌ CORS Failure Pattern:
```
POST https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
Status: (failed) CORS error
Console: "Access to fetch at '...' from origin 'https://sabalist.com' has been blocked by CORS policy"
```

### Step 3: Check Console Logs

**Successful upload:**
```
📤 [1/6] uploadImage called, platform: web
📦 [1/6] Blob created: 92.34 KB
📤 [1/6] Uploading to Storage: listings/abc123/image-0-1234567890.jpg
✅ [1/6] Upload complete in 2.34s
✅ [1/6] Download URL obtained: https://firebasestorage.googleapis.com/...
```

**CORS blocked:**
```
📤 [1/6] uploadImage called, platform: web
📦 [1/6] Blob created: 92.34 KB
📤 [1/6] Uploading to Storage: listings/abc123/image-0-1234567890.jpg
❌ [1/6] uploadBytes failed: TypeError: Failed to fetch
```

---

## 📊 Why This Is The Real Issue

### The Upload Flow:

```
Browser (sabalist.com)
  ↓
1. User selects images
  ↓
2. Images compressed to data URLs ✅
  ↓
3. Firestore document created ✅
  ↓
4. uploadBytes() called for each image
  ↓
5. Browser makes PUT request to:
   https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
  ↓
6. Firebase Storage checks CORS policy
  ↓
7. IF "sabalist.com" NOT in allowed origins:
   → Request blocked ❌
   → Upload fails
   → Timeout error
  ↓
8. IF "sabalist.com" IS in allowed origins:
   → Request succeeds ✅
   → Image uploaded
   → Download URL returned
```

### Why You See "Request timeout":

The actual error is **CORS blocking the fetch request**, but since the promise never resolves (browser blocks it before it even reaches the server), your timeout wrapper kicks in after 60 seconds and shows "Request timeout".

---

## 🧪 Testing Different Scenarios

### Test 1: CORS Not Configured (Current State)

**Symptoms:**
- Create Listing hangs at "Uploading image 1 of 6..."
- Network tab shows CORS error
- Console shows `❌ uploadBytes failed: TypeError: Failed to fetch`
- After 60 seconds: timeout error

### Test 2: CORS Configured Correctly

**Expected behavior:**
- Create Listing completes in 10-30 seconds
- Network tab shows `200 OK` for storage uploads
- Console shows `✅ Upload complete`
- Images appear in Firebase Storage bucket
- Listing shows up with images on homepage

---

## 🚨 Common Issues

### Issue 1: "CORS still not working after applying config"

**Solution:**
- Wait 2-3 minutes for changes to propagate
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Try in incognito mode

### Issue 2: "Can't access Google Cloud Console"

**Solution:**
You can configure CORS using Firebase CLI:

```bash
# Install Firebase tools
npm install -g firebase-tools

# Login
firebase login

# Deploy storage rules (includes CORS)
firebase deploy --only storage
```

But this requires a `storage.rules` file. Google Cloud Console is easier.

### Issue 3: "gsutil command not found"

**Solution:**
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Or use Google Cloud Console web interface (no CLI needed)

---

## 📋 Quick Checklist

### Must-Do (Critical):
- [ ] ✅ Configure Firebase Storage CORS (Option A or B)
- [ ] ✅ Add `sabalist.com` to Firebase Authorized Domains
- [ ] ✅ Wait 2-3 minutes for CORS to propagate

### Should-Do (Important):
- [ ] ✅ Add Firebase environment variables to Vercel
- [ ] ✅ Redeploy Vercel after adding env vars
- [ ] ✅ Test Create Listing after CORS fix

### Nice-to-Have (Optional):
- [ ] Add all Vercel preview URLs to Firebase authorized domains
- [ ] Configure Google OAuth redirect URIs if using Google Sign-In
- [ ] Set up monitoring for CORS errors

---

## 🎯 Expected Timeline

1. **Configure CORS:** 5 minutes
2. **Wait for propagation:** 2-3 minutes
3. **Add authorized domains:** 2 minutes
4. **Add Vercel env vars (if needed):** 5 minutes
5. **Redeploy and test:** 5 minutes

**Total:** ~20 minutes

---

## 📞 Verification Commands

### Check if CORS is applied:
```bash
gsutil cors get gs://sabalist.firebasestorage.app
```

### Test CORS from command line:
```bash
curl -H "Origin: https://sabalist.com" \
  -H "Access-Control-Request-Method: PUT" \
  -X OPTIONS \
  https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/test
```

### Check Firebase authorized domains:
Visit: https://console.firebase.google.com/project/sabalist/authentication/settings

---

## ✅ Success Criteria

After applying all fixes, you should see:

1. ✅ No CORS errors in browser console
2. ✅ Network tab shows `200 OK` for Storage uploads
3. ✅ Create Listing completes in <30 seconds
4. ✅ Images appear in Firebase Storage console
5. ✅ Listing shows on homepage with images
6. ✅ Same behavior on Vercel as on Amplify

---

## 🔗 Direct Links

- **Google Cloud Storage:** https://console.cloud.google.com/storage/browser
- **Firebase Auth Domains:** https://console.firebase.google.com/project/sabalist/authentication/settings
- **Vercel Env Vars:** https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables
- **Firebase Console:** https://console.firebase.google.com/project/sabalist

---

**This is the real fix. CORS configuration is what's blocking your uploads on Vercel.**
