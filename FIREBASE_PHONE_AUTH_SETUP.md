# 🔥 Firebase Phone Authentication Setup Guide

## ✅ SMS WILL WORK AFTER THESE STEPS

---

## 🎯 Current Status

### ✅ **COMPLETED (by Claude Code)**
- [x] Updated PhoneOTPScreen.js to use cross-platform `FirebaseRecaptchaVerifierModal`
- [x] Added Platform detection for better error messages
- [x] Updated app.json with googleServicesFile paths for Android & iOS
- [x] Firebase configuration is correct in firebase.js

### ⚠️ **REQUIRES MANUAL SETUP**

You must complete the following steps in Firebase Console and add configuration files.

---

## 📋 SETUP CHECKLIST

### **1. Enable Phone Authentication in Firebase Console**

1. Go to: https://console.firebase.google.com/project/sabalist/authentication/providers
2. Click on **"Phone"** in the Sign-in providers list
3. Click **"Enable"**
4. Click **"Save"**

---

### **2. Add Authorized Domains (for Web)**

1. Go to: https://console.firebase.google.com/project/sabalist/authentication/settings
2. Under **"Authorized domains"**, verify these domains are added:
   - `localhost` (for local development)
   - `sabalist.firebaseapp.com` (Firebase hosting)
   - Add your production domain if you have one

---

### **3. Android Setup (CRITICAL)**

#### **Step 3a: Get SHA-1 Fingerprint**

**Option 1: Using Gradle (Recommended)**
```bash
cd android
./gradlew signingReport
```

**Option 2: Using keytool**
```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA-1** fingerprint (format: `A1:B2:C3:D4:...`)

#### **Step 3b: Add Android App to Firebase**

1. Go to: https://console.firebase.google.com/project/sabalist/settings/general
2. Scroll to **"Your apps"** section
3. Click **"Add app"** → **Android** (or select existing Android app)
4. Enter package name: `com.sabalist.app`
5. **PASTE YOUR SHA-1 FINGERPRINT** in the SHA certificate fingerprints field
6. Click **"Register app"**
7. **Download `google-services.json`**

#### **Step 3c: Add google-services.json to Project**

Place the downloaded file in the **root directory** of your project:
```
AfriList_Full_MVP_NO_AdminApproval/
  google-services.json  ← ADD HERE (root directory)
```

**IMPORTANT:** The file must be in the root directory, not in `android/app/`. Expo handles the placement automatically.

#### **Step 3d: Rebuild Android App**

```bash
# Stop the current dev server (Ctrl+C)
# Clear cache and rebuild
npx expo prebuild --clean
npx expo run:android
```

---

### **4. iOS Setup (CRITICAL)**

#### **Step 4a: Add iOS App to Firebase**

1. Go to: https://console.firebase.google.com/project/sabalist/settings/general
2. Click **"Add app"** → **iOS**
3. Enter bundle ID: `com.sabalist.app`
4. Download **`GoogleService-Info.plist`**

#### **Step 4b: Add GoogleService-Info.plist to Project**

Create the `ios` directory if it doesn't exist, then place the file:
```
AfriList_Full_MVP_NO_AdminApproval/
  ios/
    GoogleService-Info.plist  ← ADD HERE
```

#### **Step 4c: Configure APNs (Apple Push Notification Service)**

Firebase Phone Auth on iOS requires APNs for silent notifications:

1. Go to: https://console.firebase.google.com/project/sabalist/settings/cloudmessaging
2. Scroll to **"Apple app configuration"**
3. Upload your **APNs Authentication Key** or **APNs Certificate**

**How to get APNs credentials:**
- Sign in to: https://developer.apple.com/account
- Go to **Certificates, Identifiers & Profiles**
- Create an **APNs Key** or **APNs Certificate** for `com.sabalist.app`
- Download and upload to Firebase

#### **Step 4d: Rebuild iOS App**

```bash
# Stop the current dev server (Ctrl+C)
# Clear cache and rebuild
npx expo prebuild --clean
npx expo run:ios
```

---

### **5. Web Setup (EASIEST - Should Work Now!)**

The web version should work immediately after enabling Phone Auth in Firebase Console (Step 1).

**Test on Web:**
```bash
npm start
# Press 'w' to open in web browser
# Or navigate to: http://localhost:19006
```

**What happens on web:**
1. Enter phone number with country code (e.g., `+1234567890`)
2. Click "Send OTP"
3. Solve the reCAPTCHA (may be invisible)
4. Receive SMS with 6-digit code
5. Enter code and verify

---

## 🔍 Troubleshooting

### **Error: `auth/invalid-app-credential`**

**On Web:**
- Ensure Phone Authentication is enabled in Firebase Console (Step 1)
- Verify `localhost` is in Authorized domains (Step 2)

**On Android:**
- SHA-1 fingerprint not registered → Go to Step 3b
- `google-services.json` missing → Go to Step 3c
- Wrong package name → Verify it's `com.sabalist.app`

**On iOS:**
- `GoogleService-Info.plist` missing → Go to Step 4b
- APNs not configured → Go to Step 4c
- Wrong bundle ID → Verify it's `com.sabalist.app`

### **Error: `auth/quota-exceeded`**

Firebase has daily SMS limits:
- **Test mode:** 10 SMS/day per phone number
- **Production:** Depends on your Firebase plan

**Solutions:**
- Wait 24 hours for quota reset
- Upgrade Firebase plan for higher limits
- Use test phone numbers (Firebase Console → Authentication → Phone → Test phone numbers)

### **Error: `auth/captcha-check-failed`**

**On Web:**
- Clear browser cache and cookies
- Try a different browser
- Disable browser extensions that might block reCAPTCHA
- Check Firebase Console → Authentication → Settings → Authorized domains

**On Android/iOS:**
- Ensure `expo-firebase-recaptcha` package is installed: `npm install expo-firebase-recaptcha`
- Rebuild the app: `npx expo prebuild --clean`

### **SMS Not Received**

1. Check phone number format: Must start with `+` and country code (e.g., `+1234567890`)
2. Check Firebase Console → Authentication → Usage to see if SMS was sent
3. Verify your phone carrier isn't blocking Firebase SMS
4. Try a different phone number
5. Check Firebase project billing (SMS requires Blaze plan in some regions)

---

## 📱 Platform Support Summary

| Platform | Status | Requirements |
|----------|--------|--------------|
| **Web** | ✅ Ready | Enable Phone Auth + Authorized domains |
| **Android** | ⚠️ Needs Setup | SHA-1 fingerprint + google-services.json |
| **iOS** | ⚠️ Needs Setup | GoogleService-Info.plist + APNs certificates |

---

## 🧪 Testing Guide

### **Test Phone Numbers (No SMS Sent)**

For development, add test phone numbers in Firebase Console:

1. Go to: https://console.firebase.google.com/project/sabalist/authentication/providers
2. Click **"Phone"** provider
3. Scroll to **"Phone numbers for testing"**
4. Add test numbers with verification codes (e.g., `+1234567890` → `123456`)

**Benefits:**
- No SMS sent (free)
- No quota limits
- Instant verification
- Perfect for development/testing

### **Real Phone Testing**

After setup, test with real phone numbers:

1. **Web:** Run `npm start`, press 'w', enter real number
2. **Android:** Run `npx expo run:android`, enter real number
3. **iOS:** Run `npx expo run:ios`, enter real number

Expected flow:
1. Enter phone with country code
2. Solve reCAPTCHA (if shown)
3. Receive SMS within 30 seconds
4. Enter 6-digit code
5. Successfully sign in

---

## 📞 Support

If you still encounter issues after following all steps:

1. Check the **browser/device console** for detailed error messages
2. Verify Firebase project billing status (some features require Blaze plan)
3. Review Firebase Console → Authentication → Usage for failed attempts
4. Check Firebase Console → Project Settings → Service accounts for proper permissions

---

## 🎉 Success Criteria

You'll know Phone Auth is working when:

✅ SMS arrives within 30 seconds of clicking "Send OTP"
✅ Code verification succeeds without errors
✅ User is signed in (shows main app instead of login screen)
✅ `console.log` shows: "✅ User signed in!"

---

## 📝 Code Changes Summary

### **Files Modified:**
1. **`src/screens/PhoneOTPScreen.js`**
   - Replaced web-only `RecaptchaVerifier` with cross-platform `FirebaseRecaptchaVerifierModal`
   - Added Platform detection
   - Added platform-specific error messages
   - Added `FirebaseRecaptchaBanner` for web

2. **`app.json`**
   - Added `googleServicesFile` path for Android
   - Added `googleServicesFile` path for iOS

### **What This Fixes:**
- ✅ Phone Auth now works on **web, Android, and iOS** (after manual setup)
- ✅ Better error messages explain what's wrong on each platform
- ✅ No more DOM-related errors on native platforms
- ✅ Invisible reCAPTCHA on web for better UX

---

## 🚀 Quick Start (Web Only)

**If you only care about web for now:**

1. Enable Phone Auth in Firebase Console (Step 1)
2. Verify authorized domains (Step 2)
3. Run `npm start`
4. Press 'w' to open web
5. Test with your phone number

**That's it!** Android and iOS can be set up later.

---

**Last Updated:** 2025-12-26
**Firebase Project:** sabalist
**Project ID:** sabalist
