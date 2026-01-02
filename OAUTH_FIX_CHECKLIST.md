# ✅ Google Sign-In OAuth Fix - Checklist

## 🎯 Goal
Sync Firebase OAuth credentials to fix Google Sign-In on Android.

---

## 📋 Step-by-Step Checklist

### ☐ Step 1: Download Latest Config
- [ ] Go to https://console.firebase.google.com
- [ ] Select **sabalist** project
- [ ] Click ⚙️ **Project Settings**
- [ ] Find Android app (com.sabalist.app)
- [ ] Click **google-services.json** download button
- [ ] Save file to desktop (don't open yet)

---

### ☐ Step 2: Verify OAuth Credentials

- [ ] Open the downloaded google-services.json
- [ ] Find `"oauth_client"` section
- [ ] Verify it has 1-2 entries (NOT `[]` empty)

**Example of CORRECT file:**
```json
"oauth_client": [
  {
    "client_id": "231273918004-xxxxx.apps.googleusercontent.com",
    "client_type": 3
  }
]
```

**❌ If oauth_client is EMPTY:**
- STOP ⛔
- SHA-1 not added to Firebase
- Follow [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) first
- Add SHA-1 to Firebase Console
- Wait 2-3 minutes
- Download google-services.json again

---

### ☐ Step 3: Replace Root File

**Location:** `google-services.json` (project root)

- [ ] Rename current file to `google-services.json.old` (backup)
- [ ] Copy NEW downloaded file to project root
- [ ] Rename to `google-services.json`

**Path:**
```
c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval\google-services.json
```

---

### ☐ Step 4: Replace Android Build File

**Location:** `android/app/google-services.json`

**Option A: Manual**
- [ ] Delete `android/app/google-services.json`
- [ ] Copy new file from root to `android/app/`

**Option B: Command (faster)**
```bash
copy /Y google-services.json android\app\google-services.json
```

- [ ] Verify both files are identical

---

### ☐ Step 5: Extract Web Client ID

- [ ] Open NEW google-services.json
- [ ] Find `oauth_client` array
- [ ] Locate entry with `"client_type": 3`
- [ ] Copy the `client_id` value

**Example:**
```json
{
  "client_id": "231273918004-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com",
  "client_type": 3  // ← Copy this client_id
}
```

**Your Web Client ID:**
```
231273918004-________________________________.apps.googleusercontent.com
```

---

### ☐ Step 6: Update AuthScreen.js

- [ ] Open `src/screens/AuthScreen.js`
- [ ] Go to **line 32**
- [ ] Replace placeholder with YOUR Web Client ID:

**Before:**
```javascript
webClientId: '231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
```

**After:**
```javascript
webClientId: '231273918004-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com',
```

- [ ] Save file

---

### ☐ Step 7: Rebuild App

**CRITICAL:** Native changes require full rebuild.

- [ ] Open terminal in project root
- [ ] Run commands:

```bash
# Install dependencies
npm install

# Clean prebuild
npx expo prebuild --clean

# Run on Android
npx expo run:android
```

- [ ] Wait for build to complete (~2-5 minutes)
- [ ] App should launch on device/emulator

---

### ☐ Step 8: Test Google Sign-In

- [ ] App opens → See AuthScreen
- [ ] Tap **"Continue with Google"** button
- [ ] Google account picker appears ✅
- [ ] Select Google account
- [ ] Permission screen (first time only)
- [ ] App signs in successfully ✅
- [ ] Redirected to HomeScreen ✅

**Console logs to verify:**
```
🔵 Starting Google Sign-In...
✅ Google Sign-In successful: user@gmail.com
🔥 Signing in to Firebase with Google credential...
✅ Firebase sign-in successful!
```

---

## 🐛 Troubleshooting

### ❌ DEVELOPER_ERROR or Error 10

**Cause:** OAuth not synced OR wrong SHA-1

**Fix:**
- [ ] Verify `oauth_client` is NOT empty in google-services.json
- [ ] Check SHA-1 in Firebase Console matches your keystore
- [ ] Download google-services.json again
- [ ] Rebuild app

---

### ❌ "auth/invalid-credential"

**Cause:** Wrong webClientId in AuthScreen.js

**Fix:**
- [ ] Open google-services.json
- [ ] Find client_id where client_type is 3
- [ ] Update line 32 in AuthScreen.js
- [ ] Rebuild

---

### ❌ "PLAY_SERVICES_NOT_AVAILABLE"

**Cause:** No Google Play Services on device

**Fix:**
- [ ] Use physical Android device
- [ ] OR use emulator "with Google Play" (not AOSP)

---

### ❌ oauth_client still empty after download

**Cause:** SHA-1 not in Firebase Console

**Fix:**
- [ ] Get SHA-1:
  ```bash
  keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- [ ] Add to Firebase Console → Project Settings → SHA fingerprints
- [ ] Wait 2-3 minutes
- [ ] Download google-services.json again
- [ ] Verify oauth_client has entries

---

## 🔍 Verification Commands

**Check files are identical:**
```bash
# Windows PowerShell
(Get-FileHash google-services.json).Hash -eq (Get-FileHash android\app\google-services.json).Hash
# Should return: True
```

**Check package name:**
```bash
grep "package_name" google-services.json
# Should show: "package_name": "com.sabalist.app"
```

**Check OAuth exists:**
```bash
grep -A 5 "oauth_client" google-services.json
# Should show client_id entries, NOT empty []
```

**Check SHA-1:**
```bash
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1
# Copy and compare with Firebase Console
```

---

## ✅ Success Criteria

All must be TRUE:

- [x] `oauth_client` in google-services.json is NOT empty
- [x] Both google-services.json files are identical
- [x] webClientId in AuthScreen.js is real (not placeholder)
- [x] App rebuilt successfully
- [x] Google account picker opens
- [x] User signs in without errors
- [x] Console shows "Firebase sign-in successful!"
- [x] User redirected to HomeScreen

---

## 📊 Before & After

### Before (Broken)
```json
"oauth_client": []  // ❌ EMPTY
```
**Result:** DEVELOPER_ERROR, Google Sign-In fails

### After (Fixed)
```json
"oauth_client": [
  {
    "client_id": "231273918004-xxxxx.apps.googleusercontent.com",
    "client_type": 3
  },
  {
    "client_id": "231273918004-yyyyy.apps.googleusercontent.com",
    "client_type": 1
  }
]
```
**Result:** ✅ Google Sign-In works!

---

## ⏱️ Time Estimate

- Download config: **1 minute**
- Replace files: **1 minute**
- Update AuthScreen.js: **1 minute**
- Rebuild app: **2-5 minutes**
- Testing: **1 minute**

**Total: ~6-9 minutes** ⚡

---

## 🎉 When Complete

You'll have:
- ✅ Google Sign-In working on Android
- ✅ Email Magic Link authentication
- ✅ FREE authentication (no SMS costs)
- ✅ Production-ready auth system

---

## 📚 Related Docs

- [FIX_GOOGLE_SIGNIN_OAUTH.md](FIX_GOOGLE_SIGNIN_OAUTH.md) - Detailed guide
- [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) - Full setup from scratch
- [GOOGLE_SIGNIN_QUICKSTART.md](GOOGLE_SIGNIN_QUICKSTART.md) - Quick reference

---

**Print this checklist and check off items as you complete them!** ✓
