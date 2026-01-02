# 🔵 Google Sign-In Setup Guide - Sabalist

## 🎯 Overview

Complete guide to set up Google Sign-In with Firebase Auth for your Expo-managed React Native app.

**What you're implementing:**
- Google Sign-In button in AuthScreen
- Firebase Auth integration (not expo-auth-session)
- Android support with SHA-1 fingerprints
- Free, one-tap authentication

---

## ✅ Current Status

### Already Done:

✅ `@react-native-google-signin/google-signin` added to package.json
✅ Google Sign-In code implemented in [AuthScreen.js](src/screens/AuthScreen.js)
✅ `google-services.json` in correct location (project root)
✅ Google Services gradle plugin applied
✅ Firebase Auth package installed

### TODO (5 minutes):

❌ Get SHA-1 fingerprint
❌ Add SHA-1 to Firebase Console
❌ Download new `google-services.json` with OAuth credentials
❌ Get Web Client ID from Firebase Console
❌ Update `webClientId` in AuthScreen.js
❌ Install packages
❌ Rebuild app

---

## 📋 Step-by-Step Setup

### Step 1: Get SHA-1 Fingerprint (Debug Build)

Your app uses Expo's debug keystore located at:
```
android/app/debug.keystore
```

**Get SHA-1:**

```bash
# Windows
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# Mac/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Expected output:**
```
Certificate fingerprints:
     SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
     SHA256: ...
```

**Copy the SHA-1 value** (you'll need it in Step 2)

---

### Step 2: Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **sabalist** project
3. Click ⚙️ **Project Settings**
4. Scroll to **Your apps** → Select Android app (com.sabalist.app)
5. Scroll to **SHA certificate fingerprints**
6. Click **Add fingerprint**
7. Paste your SHA-1 from Step 1
8. Click **Save**

**Result:** Firebase now knows your app's signature and can generate OAuth credentials.

---

### Step 3: Enable Google Sign-In Provider

1. Still in Firebase Console
2. Go to **Authentication** → **Sign-in method**
3. Find **Google** in the providers list
4. Click **Enable**
5. Enter **Project support email** (your email)
6. Click **Save**

---

### Step 4: Download NEW google-services.json

**CRITICAL:** You must download a fresh `google-services.json` file after adding SHA-1.

1. Still in **Project Settings** → **Your apps** → Android
2. Click **Download google-services.json** button
3. **Replace** your current file with the new one:
   ```
   c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval\google-services.json
   ```

**Verify the new file has OAuth credentials:**

Open the new file and check:
```json
"oauth_client": [
  {
    "client_id": "231273918004-xxxxxxxxxxxxx.apps.googleusercontent.com",
    "client_type": 3
  },
  {
    "client_id": "231273918004-yyyyyyyyyyyyy.apps.googleusercontent.com",
    "client_type": 1,
    "android_info": {
      "package_name": "com.sabalist.app",
      "certificate_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
    }
  }
]
```

**If `oauth_client` is still `[]` empty:**
- Go back to Step 2 and verify SHA-1 was added
- Wait 2-3 minutes for Firebase to process
- Download `google-services.json` again

---

### Step 5: Get Web Client ID

You need the **Web Client ID** (client_type: 3) for Google Sign-In configuration.

**Option A: From google-services.json**

Open your new `google-services.json` and find:
```json
"oauth_client": [
  {
    "client_id": "231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    "client_type": 3  // ← This is the Web Client ID
  }
]
```

Copy the `client_id` value where `client_type` is **3**.

**Option B: From Firebase Console**

1. Go to **Project Settings** → **General**
2. Scroll to **Your apps** → **Web app** section
3. Copy the **Web client ID**

---

### Step 6: Update AuthScreen.js with Web Client ID

Open [src/screens/AuthScreen.js](src/screens/AuthScreen.js) and find line 32:

**Replace:**
```javascript
webClientId: '231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // REPLACE THIS
```

**With:**
```javascript
webClientId: 'YOUR_ACTUAL_WEB_CLIENT_ID_FROM_STEP_5.apps.googleusercontent.com',
```

**Example:**
```javascript
webClientId: '231273918004-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com',
```

---

### Step 7: Install Dependencies

```bash
npm install
```

This installs `@react-native-google-signin/google-signin` v13.1.0 that was added to package.json.

---

### Step 8: Rebuild the App

**CRITICAL:** You MUST rebuild after:
- Adding new native dependencies
- Changing `google-services.json`
- Changing gradle files

```bash
# Clean prebuild
npx expo prebuild --clean

# Run on Android
npm run android
```

**Alternative (faster for subsequent runs):**
```bash
npm run android
```

---

## 🧪 Testing Google Sign-In

### Test Flow:

1. Open app → See AuthScreen
2. Click **"Continue with Google"** button
3. Google account picker appears
4. Select account
5. App signs you in automatically
6. You're redirected to HomeScreen

### Debug Logs:

Watch for these console logs:
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

### Error: "Developer Error" or "Error 10"

**Cause:** SHA-1 not added to Firebase OR wrong SHA-1.

**Fix:**
1. Verify SHA-1 in Firebase Console matches your debug keystore
2. Download new `google-services.json`
3. Rebuild app: `npx expo prebuild --clean && npm run android`

---

### Error: "SIGN_IN_CANCELLED"

**Cause:** User closed Google Sign-In dialog.

**Fix:** This is normal. Code already handles this (no error shown).

---

### Error: "PLAY_SERVICES_NOT_AVAILABLE"

**Cause:** Emulator/device doesn't have Google Play Services.

**Fix:**
- Use a physical device
- OR use an emulator with Google Play (not AOSP)

---

### Error: "auth/invalid-credential"

**Cause:** Web Client ID is wrong or missing.

**Fix:**
1. Get correct Web Client ID from `google-services.json` (client_type: 3)
2. Update `webClientId` in AuthScreen.js line 32
3. Rebuild app

---

### Error: "oauth_client is empty"

**Cause:** `google-services.json` doesn't have OAuth credentials yet.

**Fix:**
1. Verify SHA-1 is added in Firebase Console
2. Wait 2-3 minutes
3. Download new `google-services.json`
4. Replace old file
5. Rebuild app

---

### Google Sign-In button does nothing

**Cause:** Packages not installed or app not rebuilt.

**Fix:**
```bash
npm install
npx expo prebuild --clean
npm run android
```

---

## 🔐 SHA-1 for Production Builds

### For EAS Build:

When you build with EAS, a production keystore is created automatically.

**Get production SHA-1:**

```bash
# List credentials
eas credentials

# View Android keystore
eas credentials -p android
```

**Add production SHA-1 to Firebase Console:**
1. Copy SHA-1 from EAS credentials
2. Go to Firebase Console → Project Settings
3. Add production SHA-1 fingerprint
4. Download new `google-services.json`
5. Rebuild production app

**IMPORTANT:** Keep both debug AND production SHA-1 in Firebase Console.

---

## 📁 File Locations (Expo Managed Workflow)

### Correct Structure:

```
Sabalist/
├── google-services.json          ← ROOT (Expo copies to android/app/)
├── app.json
│   └── android.googleServicesFile: "./google-services.json"
├── package.json
│   └── @react-native-google-signin/google-signin: "^13.1.0"
├── src/
│   └── screens/
│       └── AuthScreen.js         ← Google Sign-In implementation
└── android/
    ├── build.gradle              ← Has google-services plugin
    └── app/
        ├── build.gradle          ← Applies google-services plugin
        └── google-services.json  ← Auto-copied during prebuild
```

### DO NOT manually edit:
- `android/app/google-services.json` (auto-generated)
- `android/build.gradle` (already configured)
- `android/app/build.gradle` (already configured)

### DO edit:
- `google-services.json` in project root (replace after SHA-1 setup)
- `src/screens/AuthScreen.js` line 32 (add webClientId)

---

## 🚀 Deployment Checklist

Before production release:

### 1. Production Keystore
- [ ] Create production keystore (EAS handles this)
- [ ] Get production SHA-1 from EAS
- [ ] Add to Firebase Console

### 2. Firebase Configuration
- [ ] Both debug AND production SHA-1 in Firebase
- [ ] Google Sign-In enabled in Auth providers
- [ ] Latest `google-services.json` downloaded

### 3. App Configuration
- [ ] Correct webClientId in AuthScreen.js
- [ ] Package name matches: `com.sabalist.app`
- [ ] Version updated in app.json

### 4. Testing
- [ ] Test on physical device (not emulator)
- [ ] Test with multiple Google accounts
- [ ] Test sign-out → sign-in again
- [ ] Test account switching

---

## 📊 Common Mistakes to Avoid

### ❌ DON'T:

1. **Commit `google-services.json` to GitHub**
   - Contains API keys
   - Add to `.gitignore`

2. **Use client_type 1 (Android) as webClientId**
   - Must use client_type 3 (Web)

3. **Skip rebuilding after changes**
   - Always rebuild after native changes

4. **Test only on emulator**
   - Some emulators lack Google Play Services
   - Test on real device

5. **Forget production SHA-1**
   - Debug SHA-1 won't work in production
   - Add both to Firebase

### ✅ DO:

1. **Add to .gitignore:**
   ```
   google-services.json
   ```

2. **Use environment variables for webClientId (advanced):**
   ```javascript
   webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
   ```

3. **Keep Firebase Console SHA-1 list updated:**
   - Debug SHA-1
   - Production SHA-1
   - Any developer keystores

4. **Test thoroughly before release:**
   - Multiple accounts
   - Account conflicts
   - Network errors

---

## 🔄 How It Works

### Authentication Flow:

```
User clicks "Continue with Google"
         ↓
GoogleSignin.signIn() → Google account picker
         ↓
User selects account
         ↓
Google returns ID token + user info
         ↓
Create Firebase credential from ID token
         ↓
auth().signInWithCredential(googleCredential)
         ↓
Firebase validates token with Google
         ↓
Firebase creates/logs in user
         ↓
onAuthStateChanged fires in App.js
         ↓
User redirected to MainTabNavigator
         ↓
User is now signed in! 🎉
```

### Why Web Client ID?

Google Sign-In for mobile uses **Web Client ID** (not Android Client ID).

**Reason:** Firebase Auth uses backend verification via Web OAuth flow, even on mobile apps.

**Client Types:**
- `client_type: 1` = Android (NOT used for Firebase)
- `client_type: 2` = iOS (NOT used for Firebase)
- `client_type: 3` = **Web (USE THIS)**

---

## 🎯 Expected Behavior

### After Successful Setup:

1. **First time user:**
   - Clicks Google button
   - Selects Google account
   - Account picker shows permissions
   - User confirms
   - Signed in → Home screen

2. **Returning user:**
   - Clicks Google button
   - Auto-signs in (no picker if one account)
   - OR shows account picker if multiple accounts

3. **Account conflict:**
   - If email exists with different provider (e.g., email magic link)
   - Shows error: "Account exists with different credential"
   - User must sign in with original method

---

## 📚 Code Reference

### Google Sign-In Implementation:

**File:** [src/screens/AuthScreen.js](src/screens/AuthScreen.js)

**Key sections:**

1. **Import (line 16):**
   ```javascript
   import { GoogleSignin } from '@react-native-google-signin/google-signin';
   ```

2. **Configure (lines 29-35):**
   ```javascript
   useEffect(() => {
     GoogleSignin.configure({
       webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
       offlineAccess: false,
     });
   }, []);
   ```

3. **Sign-In Function (lines 185-241):**
   ```javascript
   async function signInWithGoogle() {
     await GoogleSignin.hasPlayServices();
     const userInfo = await GoogleSignin.signIn();
     const googleCredential = auth.GoogleAuthProvider.credential(
       userInfo.data.idToken
     );
     await auth().signInWithCredential(googleCredential);
   }
   ```

4. **Button (in JSX):**
   ```javascript
   <PrimaryButton
     title="Continue with Google"
     onPress={signInWithGoogle}
     variant="outline"
     size="large"
     icon={<Ionicons name="logo-google" size={20} />}
   />
   ```

---

## 🔗 Resources

- [Firebase Console](https://console.firebase.google.com)
- [@react-native-google-signin/google-signin Docs](https://react-native-google-signin.github.io/docs/)
- [Firebase Auth with Google Docs](https://rnfirebase.io/auth/social-auth)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)

---

## ✅ Quick Setup Summary

1. ✅ Get SHA-1: `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
2. ✅ Add to Firebase Console → Project Settings → SHA fingerprints
3. ✅ Enable Google Sign-In in Authentication → Sign-in method
4. ✅ Download new `google-services.json`
5. ✅ Copy Web Client ID (client_type: 3) from file
6. ✅ Update `webClientId` in [AuthScreen.js](src/screens/AuthScreen.js) line 32
7. ✅ Install: `npm install`
8. ✅ Rebuild: `npx expo prebuild --clean && npm run android`
9. ✅ Test: Click "Continue with Google"

**Total time: ~5 minutes** ⚡

---

## 🎉 Success Indicators

You'll know it's working when:

✅ Google account picker appears
✅ You can select an account
✅ Console shows: "✅ Firebase sign-in successful!"
✅ You're redirected to home screen
✅ `auth().currentUser` is populated
✅ No "Developer Error" or "Error 10"

---

**Setup Guide for Sabalist**
*Last updated: After Email Magic Link implementation*
