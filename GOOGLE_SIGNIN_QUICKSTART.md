# ⚡ Google Sign-In Quick Start - Sabalist

## 🎯 5-Minute Setup

### Current Status

✅ Code implemented
✅ Package added to package.json
✅ google-services.json in root
❌ **Need OAuth credentials**

---

## 📋 Setup Steps

### 1. Get SHA-1 Fingerprint

```bash
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Copy the SHA-1** (looks like: `A1:B2:C3:...`)

---

### 2. Firebase Console Setup

**Go to:** https://console.firebase.google.com

**Do this:**
```
1. Select "sabalist" project
2. Click ⚙️ Project Settings
3. Scroll to "Your apps" → Android
4. Click "Add fingerprint"
5. Paste SHA-1 from Step 1
6. Click Save
7. Download NEW google-services.json
8. Replace old file in project root
```

---

### 3. Enable Google Provider

```
Firebase Console:
→ Authentication
→ Sign-in method
→ Google
→ Enable
→ Enter support email
→ Save
```

---

### 4. Get Web Client ID

**Open your NEW google-services.json:**

Find this section:
```json
"oauth_client": [
  {
    "client_id": "231273918004-xxxxxxxxxxxxx.apps.googleusercontent.com",
    "client_type": 3  // ← Find this one
  }
]
```

**Copy the `client_id` where `client_type` is 3**

---

### 5. Update AuthScreen.js

**File:** `src/screens/AuthScreen.js` **Line 32**

**Replace:**
```javascript
webClientId: '231273918004-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
```

**With your actual Web Client ID from Step 4**

---

### 6. Install & Rebuild

```bash
npm install
npx expo prebuild --clean
npm run android
```

---

## ✅ Test It

1. Open app
2. Click "Continue with Google"
3. Select account
4. Signed in! 🎉

---

## 🐛 Troubleshooting

### "Developer Error" or "Error 10"
❌ Wrong SHA-1 or not added to Firebase

**Fix:**
```bash
# Verify SHA-1
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# Add to Firebase
# Download new google-services.json
# Rebuild
npx expo prebuild --clean && npm run android
```

---

### "oauth_client is empty"
❌ Didn't download new google-services.json after adding SHA-1

**Fix:**
- Go to Firebase Console
- Project Settings → Download google-services.json
- Replace file in project root
- Rebuild

---

### "auth/invalid-credential"
❌ Wrong webClientId

**Fix:**
- Get client_id from google-services.json (client_type: 3)
- Update AuthScreen.js line 32
- Rebuild

---

### Button doesn't work
❌ App not rebuilt after code changes

**Fix:**
```bash
npm install
npx expo prebuild --clean
npm run android
```

---

## 📊 What Each File Does

### google-services.json (project root)
- Contains Firebase project config
- **Must have OAuth credentials** after SHA-1 setup
- Downloaded from Firebase Console

### package.json
- ✅ Already has: `@react-native-google-signin/google-signin: ^13.1.0`

### src/screens/AuthScreen.js
- Line 16: Import GoogleSignin
- Line 32: **YOU MUST UPDATE webClientId HERE**
- Lines 185-241: Google Sign-In implementation

### android/build.gradle
- ✅ Already has: `google-services` plugin

### android/app/build.gradle
- ✅ Already applies: `google-services` plugin

---

## 🔐 Important Notes

### Expo Managed Workflow (Your Setup)

✅ **Correct:**
- `google-services.json` in **project root**
- Expo copies to `android/app/` during prebuild
- Use `app.json` → `googleServicesFile` config

❌ **Don't:**
- Manually edit `android/app/google-services.json` (auto-generated)
- Put `google-services.json` in `android/app/` manually
- Skip rebuilding after changes

---

### SHA-1 Fingerprints

**Debug (development):**
```
Location: android/app/debug.keystore
Use: Development builds
Password: android
Alias: androiddebugkey
```

**Production (EAS Build):**
```
Get from: eas credentials
Add to: Firebase Console (separate from debug)
Use: Production builds
```

**MUST have BOTH in Firebase Console before production release.**

---

### Web Client ID vs Android Client ID

**Use Web Client ID:**
```json
"client_type": 3  // ← This one for Firebase Auth
```

**DON'T use Android Client ID:**
```json
"client_type": 1  // ❌ Not for Firebase
```

**Why?** Firebase Auth uses backend verification via Web OAuth, even on mobile.

---

## 📝 Checklist

Before testing:

- [ ] SHA-1 added to Firebase Console
- [ ] New google-services.json downloaded
- [ ] File has `oauth_client` populated (not empty)
- [ ] Web Client ID copied (client_type: 3)
- [ ] AuthScreen.js line 32 updated with webClientId
- [ ] Ran `npm install`
- [ ] Ran `npx expo prebuild --clean`
- [ ] Ran `npm run android`
- [ ] App launched on device/emulator with Google Play Services

---

## 🎯 Expected Console Logs

When it works:
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

## 📚 Full Documentation

See [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) for:
- Detailed explanations
- Production SHA-1 setup
- Advanced configuration
- Security best practices
- Error handling details

---

## ⚠️ Common Mistakes

1. ❌ Using Android Client ID instead of Web Client ID
2. ❌ Not downloading new google-services.json after SHA-1
3. ❌ Forgetting to rebuild after changes
4. ❌ Testing on emulator without Google Play Services
5. ❌ Committing google-services.json to GitHub (add to .gitignore)

---

## ✅ Success Checklist

Google Sign-In is working when:

- [x] Code implemented (done)
- [ ] SHA-1 in Firebase Console
- [ ] oauth_client in google-services.json (not empty)
- [ ] webClientId in AuthScreen.js (not placeholder)
- [ ] Packages installed
- [ ] App rebuilt
- [ ] Google account picker appears
- [ ] Can sign in successfully
- [ ] Redirected to home screen

**Complete all items = Google Sign-In works! 🎉**

---

**Quick Start for Sabalist - Google Sign-In**
