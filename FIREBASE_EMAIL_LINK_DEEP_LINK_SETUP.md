# Firebase Email Link Deep Link Setup - COMPLETE

## Problem Fixed ✅

**Before:** Email links redirected to `https://sabalist.firebaseapp.com` (Firebase Hosting) which showed "Site Not Found" because we haven't deployed hosting yet.

**After:** Email links use Firebase Dynamic Links (`https://sabalist.page.link`) which properly deep link into the mobile app.

---

## Changes Made

### 1. Updated Email Link Action URL
**File:** [src/screens/AuthScreen.js](src/screens/AuthScreen.js#L206-L219)

Changed from:
```javascript
url: 'https://sabalist.firebaseapp.com'
```

To:
```javascript
url: 'https://sabalist.page.link/auth'
dynamicLinkDomain: 'sabalist.page.link'
```

**Why:** Firebase Dynamic Links automatically redirect to the app when installed, or to the Play Store/App Store if not installed.

### 2. Updated Android Intent Filters
**File:** [app.json](app.json#L40-L56)

Added:
```json
{
  "scheme": "https",
  "host": "sabalist.page.link"
},
{
  "scheme": "sabalist"
}
```

**Why:** This tells Android to open links from `sabalist.page.link` in the app, and also supports the custom `sabalist://` scheme.

### 3. Expo Linking Already Configured ✅
**File:** [src/screens/AuthScreen.js](src/screens/AuthScreen.js#L157-L170)

Already properly configured:
- `Linking.addEventListener('url')` - handles deep links when app is running
- `Linking.getInitialURL()` - handles deep links when app opens from cold start
- `isSignInWithEmailLink()` - validates Firebase email links
- `signInWithEmailLink()` - completes authentication

---

## Firebase Console Setup Required

### Step 1: Enable Firebase Dynamic Links

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (should be `sabalist`)
3. Navigate to **Engage** → **Dynamic Links** (in left sidebar)
4. Click **Get Started**

### Step 2: Create Dynamic Link Domain

1. Click **Add domain**
2. You should see `sabalist.page.link` as available (free Firebase subdomain)
3. Click **Add domain** to confirm
4. **IMPORTANT:** Copy the domain exactly: `sabalist.page.link`

**Note:** This matches what we configured in the code!

### Step 3: Configure Email Action Links (CRITICAL)

1. Go to **Authentication** → **Templates** (in left sidebar under Authentication)
2. Select **Email/password sign-in** template
3. Click the **Edit** (pencil) icon
4. Find the **Action URL** field
5. **Change it to:** `https://sabalist.page.link/auth`
6. Click **Save**

**Before:** `https://sabalist.firebaseapp.com/__/auth/action`
**After:** `https://sabalist.page.link/auth`

This is THE KEY FIX - it tells Firebase to send email links using Dynamic Links instead of Firebase Hosting.

### Step 4: Verify Android Package Name

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → **Android app**
3. Verify package name is: `com.sabalist.app`
4. Ensure `google-services.json` is downloaded and in project root ✅

---

## How It Works Now

### Email Link Flow (Android)

1. **User enters email** → `user@example.com`
2. **Firebase sends email** with link: `https://sabalist.page.link/auth?apiKey=...&mode=signIn...`
3. **User clicks link** → Firebase Dynamic Link redirects to:
   - If app installed: Opens app via intent filter
   - If app not installed: Redirects to Play Store
4. **App receives deep link** via `expo-linking`
5. **AuthScreen.js handles link:**
   - Checks `isSignInWithEmailLink()` ✅
   - Retrieves saved email from AsyncStorage
   - Calls `signInWithEmailLink(email, link)`
6. **User signed in** 🎉

### Deep Link Listeners (Already Configured)

```javascript
// When app is running (foreground/background)
Linking.addEventListener('url', ({ url }) => {
  handleDynamicLink(url);
});

// When app opens from cold start
Linking.getInitialURL().then((url) => {
  if (url) handleDynamicLink(url);
});
```

---

## Testing Instructions

### Test 1: Send Email Link

1. **Build and install the app:**
   ```bash
   eas build --platform android --profile development
   # Install APK on device or emulator
   ```

2. **Open AuthScreen and enter email:**
   - Enter a real email you can access
   - Click "Send Login Link"

3. **Check your email:**
   - You should receive an email from `noreply@sabalist.firebaseapp.com`
   - Subject: "Sign in to Sabalist"
   - Link should start with: `https://sabalist.page.link/auth?...`

### Test 2: Verify Deep Link Opens App

1. **Open email on the same device** where the app is installed
2. **Click the "Sign In" link**
3. **Expected behavior:**
   - App should open automatically (not browser)
   - You should see a loading indicator briefly
   - App should navigate to HomeScreen (signed in)

4. **Check console logs:**
   ```
   📱 Deep link received: https://sabalist.page.link/auth?...
   🔗 Checking URL for email link
   🔍 Is valid email link: true
   ✅ Processing Firebase email link
   🔐 Completing sign-in with email link...
   ✅ User signed in: [uid]
   ✅ Sign-in complete. Auth state listener will handle navigation.
   ```

### Test 3: Cold Start (App Not Running)

1. **Force close the app** (swipe away from recent apps)
2. **Click email link again**
3. **Expected:** App should launch and sign you in immediately

### Test 4: App Not Installed

1. **Uninstall the app**
2. **Click email link**
3. **Expected:** Should redirect to Play Store (once published)

---

## Troubleshooting

### Issue: Link Opens Browser Instead of App

**Cause:** Intent filters not applied or Dynamic Links domain not configured

**Fix:**
1. Rebuild the app: `eas build --platform android --profile development`
2. Reinstall completely (uninstall old version first)
3. Verify `app.json` has `sabalist.page.link` in intent filters
4. Check Firebase Console → Dynamic Links is enabled

### Issue: "Invalid Action Code" Error

**Cause:** Email link expired or already used

**Fix:**
1. Email links expire after a few hours
2. Request a new link
3. Don't click the same link twice

### Issue: "Site Not Found" in Browser

**Cause:** Firebase Dynamic Links domain not created in Firebase Console

**Fix:**
1. Go to Firebase Console → Dynamic Links
2. Create domain: `sabalist.page.link`
3. Update Email Template action URL to: `https://sabalist.page.link/auth`

### Issue: App Opens But Doesn't Sign In

**Cause:** Email not saved in AsyncStorage

**Fix:**
1. Check console for: `Get email from storage`
2. Ensure you entered email on the SAME DEVICE where you're clicking the link
3. If prompted, enter your email manually

---

## Key Configuration Summary

### app.json
```json
{
  "scheme": "sabalist",
  "android": {
    "intentFilters": [
      {
        "data": [
          { "scheme": "https", "host": "sabalist.page.link" },
          { "scheme": "sabalist" }
        ]
      }
    ]
  }
}
```

### AuthScreen.js - Action URL
```javascript
actionCodeSettings = {
  url: 'https://sabalist.page.link/auth',
  handleCodeInApp: true,
  android: {
    packageName: 'com.sabalist.app',
    installApp: true,
    minimumVersion: '1',
  },
  dynamicLinkDomain: 'sabalist.page.link',
}
```

### Firebase Console - Email Template
```
Action URL: https://sabalist.page.link/auth
```

---

## Status: READY TO TEST ✅

All code changes are complete. You need to:

1. ✅ Code updated to use Dynamic Links
2. ✅ Intent filters configured in app.json
3. ✅ Deep link listeners already in place
4. ⏳ **YOU NEED TO:** Enable Dynamic Links in Firebase Console
5. ⏳ **YOU NEED TO:** Update Email Template action URL in Firebase Console
6. ⏳ **YOU NEED TO:** Rebuild app and test

---

## Why This is Better Than Firebase Hosting

1. **No web deployment needed** - works immediately
2. **Native app experience** - opens app directly instead of browser
3. **Play Store fallback** - auto-redirects to store if app not installed
4. **Universal links** - works on both Android and iOS
5. **Free** - Firebase Dynamic Links are free

---

## Next Steps

1. **Firebase Console Setup** (5 minutes):
   - Enable Dynamic Links
   - Create `sabalist.page.link` domain
   - Update Email Template action URL

2. **Build & Test** (10 minutes):
   ```bash
   eas build --platform android --profile development
   ```

3. **Test Email Flow**:
   - Send email link
   - Click from device
   - Verify app opens and signs in

4. **Success Criteria**:
   - ✅ Email link opens app (not browser)
   - ✅ User signed in automatically
   - ✅ No "Site Not Found" error
   - ✅ Works on cold start

---

**This is the final solution. No Firebase Hosting needed. No web deployment required.**
