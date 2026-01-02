# 🔧 Fix Google Sign-In OAuth - Sabalist

## 🔴 Issue Confirmed

**Current Status:**
```json
"oauth_client": []  // ❌ EMPTY - This is why Google Sign-In fails
```

**Root Cause:**
Your `google-services.json` files are outdated. Even though you've added SHA-1/SHA-256 to Firebase Console, the local files don't have the OAuth credentials that Firebase generated.

**Files affected:**
- `google-services.json` (project root)
- `android/app/google-services.json` (auto-generated)

---

## ✅ The Fix (5 Minutes)

### Step 1: Download Latest google-services.json

**Go to Firebase Console:**
1. Open: https://console.firebase.google.com
2. Select: **sabalist** project
3. Click: ⚙️ **Project Settings** (gear icon in sidebar)
4. Scroll to: **Your apps** section
5. Find: Android app (com.sabalist.app)
6. Click: **google-services.json** button

![Firebase Download](https://i.imgur.com/xxxxx.png)

**Save the downloaded file** - don't open it yet.

---

### Step 2: Replace BOTH Files

**IMPORTANT:** You need to replace BOTH copies.

#### 2a. Replace Root File

**Location:**
```
c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval\google-services.json
```

**Action:**
1. Delete or rename current file to `google-services.json.old`
2. Move downloaded file to this location
3. Rename to `google-services.json` (if needed)

#### 2b. Replace Android Build File

**Location:**
```
c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval\android\app\google-services.json
```

**Action:**
1. Delete current file
2. Copy the NEW file from root to this location

**Command (faster):**
```bash
# Windows PowerShell
Copy-Item google-services.json android\app\google-services.json -Force

# Windows CMD
copy /Y google-services.json android\app\google-services.json

# Mac/Linux
cp google-services.json android/app/google-services.json
```

---

### Step 3: Verify OAuth Credentials

**Open the NEW google-services.json and verify:**

```json
{
  "project_info": {
    "project_number": "231273918004",
    "project_id": "sabalist"
  },
  "client": [
    {
      "client_info": {
        "package_name": "com.sabalist.app"
      },
      "oauth_client": [  // ← MUST NOT BE EMPTY
        {
          "client_id": "231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
          "client_type": 3  // Web client
        },
        {
          "client_id": "231273918004-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
          "client_type": 1,  // Android client
          "android_info": {
            "package_name": "com.sabalist.app",
            "certificate_hash": "a1b2c3d4e5f6..."  // Your SHA-1
          }
        }
      ],
      "api_key": [
        {
          "current_key": "AIzaSy..."
        }
      ]
    }
  ]
}
```

**✅ MUST SEE:**
- `oauth_client` array has 1-2 entries (NOT empty)
- At least one entry with `"client_type": 3` (Web Client ID)
- One entry with `"client_type": 1` (Android Client ID)
- Android entry has your `certificate_hash` (SHA-1)

**❌ If oauth_client is STILL empty:**

**STOP and check:**
1. Did you add SHA-1 to Firebase Console?
   - Go to Project Settings → Android app → SHA certificate fingerprints
   - Should see your SHA-1 listed
2. Wait 2-3 minutes after adding SHA-1
3. Try downloading google-services.json again
4. If still empty, SHA-1 is not registered properly

---

### Step 4: Get Web Client ID

From your NEW `google-services.json`, find the **Web Client ID**:

```json
"oauth_client": [
  {
    "client_id": "231273918004-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com",
    "client_type": 3  // ← This is Web Client ID
  }
]
```

**Copy this `client_id` value** - you'll need it next.

---

### Step 5: Update AuthScreen.js

**File:** [src/screens/AuthScreen.js](src/screens/AuthScreen.js)

**Find line 32:**
```javascript
webClientId: '231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // REPLACE THIS
```

**Replace with your actual Web Client ID from Step 4:**
```javascript
webClientId: '231273918004-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com',
```

**Save the file.**

---

### Step 6: Rebuild Android App

**CRITICAL:** OAuth changes require a full rebuild.

#### Option A: Expo Development Build (Recommended)

```bash
# Clean prebuild
npx expo prebuild --clean

# Install dependencies
npm install

# Run on Android
npx expo run:android
```

**Total time:** ~2-5 minutes

#### Option B: EAS Build (Production)

```bash
# Build APK
eas build -p android --profile preview

# Or AAB for Play Store
eas build -p android --profile production
```

**Total time:** ~10-15 minutes (cloud build)

---

### Step 7: Verify Runtime

**Launch the app and test:**

1. ✅ App opens → AuthScreen visible
2. ✅ Tap **"Continue with Google"** button
3. ✅ Google account chooser opens
4. ✅ Select Google account
5. ✅ App signs in successfully
6. ✅ Redirected to HomeScreen

**Console logs to watch for:**
```
🔵 Starting Google Sign-In...
✅ Google Sign-In successful: user@gmail.com
🔥 Signing in to Firebase with Google credential...
✅ Firebase sign-in successful!
   User ID: abc123xyz
   Email: user@gmail.com
   Display Name: John Doe
```

---

## 🐛 Troubleshooting

### Error: "DEVELOPER_ERROR" or "Error 10"

**Cause:** OAuth client still not synced OR wrong SHA-1

**Fix:**
1. Open `android/app/google-services.json`
2. Verify `oauth_client` is NOT empty
3. If empty:
   - Check SHA-1 in Firebase Console
   - Download google-services.json again
   - Replace both files
   - Rebuild

**Verify SHA-1 matches:**
```bash
# Get your current SHA-1
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1

# Compare with Firebase Console → Project Settings → SHA fingerprints
```

---

### Error: "auth/invalid-credential"

**Cause:** Wrong `webClientId` in AuthScreen.js

**Fix:**
1. Open NEW `google-services.json`
2. Find `client_id` where `client_type: 3`
3. Copy EXACT value
4. Update line 32 in [AuthScreen.js](src/screens/AuthScreen.js:32)
5. Rebuild

---

### Error: "SIGN_IN_CANCELLED"

**This is normal** - user closed the Google picker. No fix needed.

---

### google-services.json still has empty oauth_client

**Cause:** SHA-1 not properly added to Firebase

**Fix:**
1. Go to Firebase Console
2. Project Settings → Your apps → Android
3. **SHA certificate fingerprints** section
4. Click "Add fingerprint"
5. Paste your SHA-1 (from debug.keystore)
6. Click Save
7. **Wait 2-3 minutes**
8. Download google-services.json again
9. Check if oauth_client is populated

**If STILL empty after 5 minutes:**

The issue is with Firebase configuration. Check:
- Correct project selected
- Correct Android app (com.sabalist.app)
- SHA-1 format is valid (no spaces, uppercase letters with colons)
- Google Sign-In provider is enabled in Authentication

---

### App won't build after replacing google-services.json

**Cause:** Corrupted file or wrong format

**Fix:**
1. Validate JSON format:
   - Open in VS Code
   - Check for syntax errors
   - Should start with `{` and end with `}`
2. Re-download from Firebase Console
3. Ensure package_name is "com.sabalist.app"

---

## 📋 Pre-Flight Checklist

Before rebuilding, verify:

- [ ] SHA-1 added to Firebase Console
- [ ] SHA-256 added to Firebase Console (optional but recommended)
- [ ] Google Sign-In enabled in Firebase Authentication
- [ ] New google-services.json downloaded
- [ ] `oauth_client` array is NOT empty in new file
- [ ] Web Client ID copied (client_type: 3)
- [ ] AuthScreen.js line 32 updated with webClientId
- [ ] Both google-services.json files replaced:
  - Root: `google-services.json`
  - Android: `android/app/google-services.json`

---

## 🎯 Expected File Structure After Fix

```
Sabalist/
├── google-services.json          ← NEW file with OAuth
│   └── oauth_client: [...]       ← NOT empty
│
├── android/
│   └── app/
│       └── google-services.json  ← Copy of root file
│           └── oauth_client: [...]
│
└── src/
    └── screens/
        └── AuthScreen.js
            └── Line 32: webClientId: "231273918004-xxx.apps.googleusercontent.com"
```

---

## 🔍 How to Verify Files Match

**Run this to compare:**

```bash
# Windows PowerShell
(Get-FileHash google-services.json).Hash -eq (Get-FileHash android\app\google-services.json).Hash

# Should output: True
```

**Or manually compare:**
1. Open both files
2. Check `oauth_client` sections are identical
3. Both should have same client IDs

---

## ⚡ Quick Command Summary

```bash
# 1. Download google-services.json from Firebase Console

# 2. Replace both files
copy /Y google-services.json android\app\google-services.json

# 3. Update AuthScreen.js line 32 with Web Client ID

# 4. Rebuild
npx expo prebuild --clean
npm install
npx expo run:android

# 5. Test Google Sign-In
```

---

## ✅ Success Indicators

You'll know it's fixed when:

✅ `oauth_client` in google-services.json has 1-2 entries
✅ No build errors
✅ Google account picker appears when tapping button
✅ No "DEVELOPER_ERROR" or "Error 10"
✅ User signs in successfully
✅ Console shows: "✅ Firebase sign-in successful!"
✅ User redirected to HomeScreen

---

## 🎉 After Success

**What you'll have:**
- ✅ Google Sign-In working on Android
- ✅ Email Magic Link authentication
- ✅ Both auth methods integrated
- ✅ Zero SMS costs
- ✅ Production-ready auth

**Next steps:**
1. Test with multiple Google accounts
2. Test sign-out → sign-in again
3. Test account switching
4. Add production SHA-1 before Play Store release

---

## 📚 Related Documentation

- [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) - Complete setup guide
- [GOOGLE_SIGNIN_QUICKSTART.md](GOOGLE_SIGNIN_QUICKSTART.md) - Quick reference
- [AUTH_MIGRATION_COMPLETE.md](AUTH_MIGRATION_COMPLETE.md) - Overall auth strategy

---

## 🔐 Security Note

**DO NOT commit google-services.json to GitHub:**

Add to `.gitignore`:
```
# Firebase
google-services.json
android/app/google-services.json
GoogleService-Info.plist
```

**Why?**
- Contains API keys
- Contains OAuth client IDs
- Should be kept private

**For team collaboration:**
- Share file securely (1Password, encrypted)
- OR each developer downloads from Firebase Console
- Document where to get it in README

---

## 🆘 Still Not Working?

**Check this debug info:**

```bash
# 1. Verify package name
grep "package_name" google-services.json
# Should show: "package_name": "com.sabalist.app"

# 2. Verify OAuth exists
grep -A 10 "oauth_client" google-services.json
# Should show client IDs, NOT empty []

# 3. Check SHA-1
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1

# 4. Compare with Firebase Console
# Firebase Console → Project Settings → SHA fingerprints
# Should match exactly
```

**If all above check out but still fails:**

1. Clean build completely:
   ```bash
   # Delete build cache
   rm -rf android/app/build
   rm -rf android/build
   rm -rf node_modules

   # Reinstall
   npm install

   # Clean rebuild
   npx expo prebuild --clean
   npx expo run:android
   ```

2. Check Android logs:
   ```bash
   # While app is running
   npx react-native log-android

   # Filter for Google Sign-In errors
   adb logcat | grep -i "google\|oauth\|auth"
   ```

3. Verify Google Play Services on device/emulator:
   - Physical device: Should have Google Play Services
   - Emulator: Must be "with Google Play" image (not AOSP)

---

**Fix OAuth sync issue - Sabalist**
*Follow steps 1-7 in order*
