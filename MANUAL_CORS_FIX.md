# 🔧 Manual CORS Fix - Step by Step

Since automated configuration requires authentication, follow these steps manually:

---

## ✅ Option 1: Use Google Cloud Console (NO COMMAND LINE - EASIEST)

### Step 1: Open Google Cloud Storage
1. Go to: https://console.cloud.google.com/storage/browser
2. **Sign in** with your Google account (same account that owns the Firebase project)
3. **Select project:** Choose `sabalist` from the dropdown at the top

### Step 2: Find Your Storage Bucket
Look for one of these bucket names:
- `sabalist.firebasestorage.app`
- `sabalist.appspot.com`

Click on the bucket name to open it.

### Step 3: Configure CORS
1. Click the **"Configuration"** tab (near "Objects", "Permissions")
2. Look for **"CORS configuration"** section
3. Click **"Edit CORS configuration"** or **"Add CORS policy"**

### Step 4: Paste CORS JSON
Copy and paste this EXACTLY:

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

### Step 5: Save
1. Click **"Save"** button
2. **Wait 2-3 minutes** for changes to propagate globally

### Step 6: Verify
After 2-3 minutes, refresh the page and check that the CORS configuration shows your domains.

---

## ✅ Option 2: Use Command Line (if you prefer terminal)

### Prerequisites
Make sure you're logged in to gcloud:

```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project sabalist
```

### Apply CORS Configuration

Run this command in the project directory:

```bash
gsutil cors set cors.json gs://sabalist.firebasestorage.app
```

### Verify CORS Was Applied

```bash
gsutil cors get gs://sabalist.firebasestorage.app
```

**Expected output:**
```json
[{"maxAgeSeconds": 3600, "method": ["GET", "HEAD", "PUT", "POST", "DELETE"], "origin": ["https://sabalist.com", "https://www.sabalist.com", ...], "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]}]
```

---

## ✅ Step 2: Add Firebase Authorized Domains

### Go to Firebase Console
1. Visit: https://console.firebase.google.com/project/sabalist/authentication/settings
2. Click **"Authorized domains"** tab
3. Click **"Add domain"** button

### Add These Domains (one at a time):
- `sabalist.com`
- `www.sabalist.com`
- `afrilist-mvp.vercel.app`

Click **"Add"** after entering each domain.

---

## ✅ Step 3: Add Vercel Environment Variables

### Go to Vercel Dashboard
Visit: https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables

### Add These 7 Variables

For EACH variable:
1. Click **"Add New"** button
2. Enter **Variable Name** (left field)
3. Enter **Value** (right field)
4. Check **ALL THREE** environment types:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

**Variables to add:**

| Name | Value |
|------|-------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `sabalist.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `sabalist` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `sabalist.firebasestorage.app` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `231273918004` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:231273918004:web:0020dcc14b7f52e3356461` |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-LGGRMQBGSD` |

### Redeploy After Adding Variables
1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click **"⋮"** (three dots)
4. Click **"Redeploy"**
5. Wait for deployment to complete (~2 minutes)

---

## 🧪 Testing After Fix

### Wait Before Testing
- **CORS propagation:** 2-3 minutes after saving
- **Vercel deployment:** 2-3 minutes after triggering redeploy
- **Total wait:** ~5 minutes

### Test Create Listing

1. **Open your site:** https://sabalist.com
2. **Open DevTools:** Press F12
3. **Go to Network tab**
4. **Clear console:** Click 🚫 icon
5. **Try creating a listing:**
   - Sign in
   - Go to "Post a Listing"
   - Add 3-6 images
   - Fill all required fields
   - Click "Post Listing"

### Watch Network Tab

Look for requests to `firebasestorage.googleapis.com`:

**✅ SUCCESS (CORS working):**
```
POST https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
Status: 200 OK
Headers:
  access-control-allow-origin: https://sabalist.com
```

**❌ FAILURE (CORS still blocked):**
```
POST https://firebasestorage.googleapis.com/v0/b/sabalist.firebasestorage.app/o/...
Status: (failed)
Console: Access to fetch at '...' blocked by CORS policy
```

### Watch Console Logs

**✅ SUCCESS:**
```
🔥 Firebase Web SDK initialized: { hasAuth: true, hasConfig: true, projectId: 'sabalist' }
🔧 Firebase factory initialized for platform: web
🚀 ========== SUBMIT STARTED ==========
📝 Calling Firestore addDoc...
✅ Listing created in Firestore: abc123
📤 [1/6] uploadImage called, platform: web
📦 [1/6] Blob created: 92.34 KB
📤 [1/6] Uploading to Storage: listings/abc123/image-0-1234567890.jpg
✅ [1/6] Upload complete in 2.34s
✅ [1/6] Download URL obtained
... (continues for all images)
✅ ========== SUBMIT COMPLETE: abc123 ==========
```

**❌ FAILURE:**
```
📤 [1/6] Uploading to Storage: listings/abc123/image-0-1234567890.jpg
❌ [1/6] uploadBytes failed: TypeError: Failed to fetch
(or after 60 seconds)
⏱️ TIMEOUT: Image 1 upload exceeded 60000ms
```

---

## 📋 Quick Checklist

### Must Complete:
- [ ] ✅ Configure Firebase Storage CORS (Option 1 OR Option 2)
- [ ] ✅ Add authorized domains to Firebase Auth
- [ ] ✅ Wait 2-3 minutes for CORS propagation
- [ ] ✅ Test Create Listing

### Should Complete:
- [ ] ✅ Add environment variables to Vercel
- [ ] ✅ Redeploy Vercel
- [ ] ✅ Hard refresh browser (Ctrl+Shift+R)

### Verify Success:
- [ ] ✅ No CORS errors in console
- [ ] ✅ Storage uploads show 200 OK in Network tab
- [ ] ✅ Create Listing completes in <30 seconds
- [ ] ✅ Images appear in Firebase Storage bucket
- [ ] ✅ Listing shows on homepage with images

---

## 🆘 If Still Not Working

### Double-Check CORS Configuration
Go back to: https://console.cloud.google.com/storage/browser

1. Click on your bucket
2. Click "Configuration" tab
3. Verify CORS configuration shows:
   - `origin`: includes `https://sabalist.com`
   - `method`: includes `PUT`, `POST`
   - `responseHeader`: includes `Content-Type`

### Check Browser Console
Look for these specific errors:

**Error 1:** `Access to fetch at 'https://firebasestorage.googleapis.com/...' blocked by CORS`
- **Solution:** CORS not configured correctly, try again

**Error 2:** `Firebase: Error (auth/unauthorized-domain)`
- **Solution:** Add domain to Firebase Authorized Domains

**Error 3:** `Firebase Web SDK initialized: { hasConfig: false }`
- **Solution:** Environment variables not in Vercel, add them

### Clear Everything and Try Again
1. **Clear browser cache:** Ctrl+Shift+Delete → Clear all
2. **Hard refresh:** Ctrl+Shift+R
3. **Try incognito mode**
4. **Wait full 5 minutes** after making changes

---

## ✅ Expected Result

After completing all steps:
- ✅ Create Listing works on Vercel
- ✅ Images upload to Firebase Storage
- ✅ No timeout errors
- ✅ Same behavior as AWS Amplify
- ✅ Listings show on homepage with images

---

## 📞 Direct Links

- **Google Cloud Storage:** https://console.cloud.google.com/storage/browser
- **Firebase Auth Domains:** https://console.firebase.google.com/project/sabalist/authentication/settings
- **Vercel Env Vars:** https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables
- **Live Site:** https://sabalist.com

---

**Start with Option 1 (Google Cloud Console) - it's the easiest and doesn't require command line!**
