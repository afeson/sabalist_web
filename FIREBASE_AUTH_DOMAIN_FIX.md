# Firebase Email Link Authentication - Domain Authorization Fix

## ROOT CAUSE IDENTIFIED ✅

**Error:** `[auth/unauthorized-domain] Domain not allowlisted by project`

**Current Configuration:**
- **Action URL (Native):** `https://sabalist.page.link/auth`
- **Action URL (Web):** `window.location.origin` (varies based on where app is running)
- **Expo Scheme:** `sabalist://`

**Problem:** The domains used in email links are NOT authorized in Firebase Authentication settings.

---

## EXACT ACTION URLs BEING USED

### 1. Native App (Android/iOS)
**Location:** [src/screens/AuthScreen.js:207](src/screens/AuthScreen.js#L207)

```javascript
actionCodeSettings = {
  url: 'https://sabalist.page.link/auth',
  handleCodeInApp: true,
  android: {
    packageName: 'com.sabalist.app',
    installApp: true,
    minimumVersion: '1',
  },
  iOS: {
    bundleId: 'com.sabalist.app',
  },
  dynamicLinkDomain: 'sabalist.page.link',
}
```

**Action URL:** `https://sabalist.page.link/auth`
**Domain to Authorize:** `sabalist.page.link`

### 2. Web App
**Location:** [src/screens/AuthScreen.js:198-200](src/screens/AuthScreen.js#L198-L200)

```javascript
const currentUrl = window.location.origin;
actionCodeSettings = {
  url: currentUrl,
  handleCodeInApp: true,
}
```

**Possible URLs:**
- Development: `http://localhost:19006` or `http://localhost:8081`
- Expo Web: `https://[project-id].exp.direct`
- Firebase: `https://sabalist.web.app` or `https://sabalist.firebaseapp.com`

**Domains to Authorize:**
- `localhost`
- `sabalist.web.app`
- `sabalist.firebaseapp.com`
- Any Expo-generated domains if testing on Expo Go

---

## FIREBASE CONSOLE FIX - STEP BY STEP

### Step 1: Access Firebase Authentication Settings

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **Sabalist** project
3. Click **Authentication** in left sidebar
4. Click **Settings** tab (top of page)
5. Scroll down to **Authorized domains** section

### Step 2: Add Required Domains

Click **Add domain** for each of the following:

#### ✅ Required Domains (Add All):

1. **`sabalist.page.link`**
   - **Purpose:** Firebase Dynamic Links for email authentication
   - **Used by:** Native app (Android/iOS)
   - **Priority:** CRITICAL - This fixes your main error

2. **`localhost`**
   - **Purpose:** Local development testing
   - **Used by:** Web development mode
   - **Priority:** HIGH - For testing email links locally

3. **`sabalist.web.app`**
   - **Purpose:** Firebase Hosting default domain
   - **Used by:** Web app (if deployed)
   - **Priority:** MEDIUM - For future web deployment

4. **`sabalist.firebaseapp.com`**
   - **Purpose:** Firebase Hosting legacy domain
   - **Used by:** Web app (if deployed)
   - **Priority:** MEDIUM - For future web deployment

#### Optional (if using Expo Go or custom domain):

5. **`*.exp.direct`** (wildcard for Expo web)
   - **Purpose:** Expo web development URLs
   - **Used by:** Expo Go web mode
   - **Note:** May need to add specific Expo URLs if wildcard doesn't work

6. **`sabalist.app`** (if you own this domain)
   - **Purpose:** Custom domain for production
   - **Used by:** Production web app
   - **Priority:** LOW - Only if you have custom domain

### Step 3: Verify Configuration

After adding domains, your **Authorized domains** list should look like:

```
✅ localhost
✅ sabalist.page.link
✅ sabalist.web.app
✅ sabalist.firebaseapp.com
```

**Default domains (already there):**
- `[your-project-id].firebaseapp.com`
- `[your-project-id].web.app`

### Step 4: Save Changes

- Firebase saves automatically as you add domains
- No rebuild required for Firebase changes
- Changes propagate within 1-2 minutes

---

## EXPO DEEP LINKING VERIFICATION

### Current Configuration in app.json ✅

**File:** [app.json:10](app.json#L10)

```json
{
  "expo": {
    "scheme": "sabalist",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "https", "host": "sabalist.page.link" },
            { "scheme": "https", "host": "sabalist.web.app" },
            { "scheme": "https", "host": "sabalist.firebaseapp.com" },
            { "scheme": "sabalist" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Status:** ✅ CORRECTLY CONFIGURED

This tells Android to open these URLs in the Sabalist app:
- `https://sabalist.page.link/*` ✅
- `https://sabalist.web.app/*` ✅
- `https://sabalist.firebaseapp.com/*` ✅
- `sabalist://*` ✅

---

## EXPO LINKING VERIFICATION

### Current Implementation in AuthScreen.js ✅

**File:** [src/screens/AuthScreen.js:15](src/screens/AuthScreen.js#L15)

```javascript
import * as Linking from 'expo-linking';
```

**Deep Link Listeners:** [src/screens/AuthScreen.js:157-170](src/screens/AuthScreen.js#L157-L170)

```javascript
// Listen for deep links when app is running
const subscription = Linking.addEventListener('url', ({ url }) => {
  console.log('📱 Deep link received:', url);
  handleDynamicLink(url);
});

// Check if app was opened with a deep link (cold start)
Linking.getInitialURL().then((url) => {
  if (url) {
    console.log('📱 Initial URL:', url);
    handleDynamicLink(url);
  }
});
```

**Status:** ✅ CORRECTLY CONFIGURED

- Uses `expo-linking` (not native modules) ✅
- Works with Expo Go ✅
- Handles both cold start and warm start ✅

---

## COMPLETE FIX CHECKLIST

### Firebase Console (YOU MUST DO THIS):

- [ ] Go to Firebase Console → Authentication → Settings
- [ ] Click "Add domain" for each required domain:
  - [ ] `sabalist.page.link` (CRITICAL)
  - [ ] `localhost` (for testing)
  - [ ] `sabalist.web.app`
  - [ ] `sabalist.firebaseapp.com`
- [ ] Verify all domains appear in Authorized domains list
- [ ] Wait 2 minutes for changes to propagate

### Code Configuration (ALREADY DONE ✅):

- [x] Action URL uses `sabalist.page.link` for native
- [x] Expo scheme defined in app.json (`sabalist`)
- [x] Intent filters configured for deep linking
- [x] expo-linking properly imported and used
- [x] Deep link listeners handle both cold/warm start

### Testing Steps:

1. **NO REBUILD NEEDED** - Just authorize domains in Firebase Console
2. Open existing app on device
3. Send email link
4. Click link from email

---

## TESTING PROCEDURE

### Test 1: Send Email Link (No Changes Needed)

```bash
# App is already running on your device/emulator
# No need to rebuild since code is correct
```

1. Open AuthScreen in the app
2. Enter your email
3. Click "Send Login Link"
4. Check console:
   ```
   📧 Sending magic link to: your@email.com
   ✅ Magic link sent successfully!
   ```

### Test 2: Authorize Domains in Firebase Console

**BEFORE clicking the email link, do this:**

1. Go to Firebase Console → Authentication → Settings
2. Add these domains:
   - `sabalist.page.link`
   - `localhost`
   - `sabalist.web.app`
   - `sabalist.firebaseapp.com`
3. Wait 2 minutes

### Test 3: Click Email Link

1. Open your email on the SAME device
2. Find email from `noreply@sabalist.firebaseapp.com`
3. Click the "Sign In" link
4. **Expected behavior:**
   - App opens (not browser)
   - Console shows:
     ```
     📱 Deep link received: https://sabalist.page.link/auth?...
     🔗 Checking URL for email link
     🔍 Is valid email link: true
     ✅ Processing Firebase email link
     🔐 Completing sign-in with email link...
     ✅ User signed in: [uid]
     ```
   - App navigates to HomeScreen
   - User is signed in ✅

### Test 4: Verify No Errors

**Check for these common errors (should NOT appear):**

❌ `[auth/unauthorized-domain]` - Domain not authorized
- **Fix:** Add domain to Firebase Console

❌ `[auth/invalid-action-code]` - Link expired
- **Fix:** Request new email link (links expire after 1 hour)

❌ Browser opens showing "Site Not Found"
- **Fix:** Ensure intent filters in app.json are correct (already done ✅)

---

## WHAT HAPPENS WHEN USER CLICKS EMAIL LINK

### Flow Diagram

```
User receives email with link:
https://sabalist.page.link/auth?apiKey=xyz&mode=signIn&oobCode=abc...
    ↓
Firebase checks: Is domain authorized?
    ↓
YES (after you add sabalist.page.link to Authorized domains)
    ↓
Firebase Dynamic Link processes the link
    ↓
Detects Android app installed (com.sabalist.app)
    ↓
Opens app via deep link intent:
sabalist://auth?apiKey=xyz&mode=signIn&oobCode=abc...
    ↓
Android intent filter matches:
{ scheme: "sabalist" } ✅
    ↓
App launches and Linking.getInitialURL() receives URL
    ↓
AuthScreen.js useEffect() triggered
    ↓
handleDynamicLink(url) function:
1. auth().isSignInWithEmailLink(url) → true ✅
2. AsyncStorage.getItem('emailForSignIn') → your@email.com
3. auth().signInWithEmailLink(email, url)
    ↓
Firebase Auth validates:
- Link is valid ✅
- Email matches ✅
- Link not expired ✅
- Domain authorized ✅
    ↓
User authenticated
    ↓
App.js auth listener: onAuthStateChanged(user)
    ↓
Navigate to HomeScreen
    ↓
✅ USER SIGNED IN ✅
```

---

## DEBUGGING COMMANDS

### Check Current Linking URL (for development)

Add temporary logging to AuthScreen.js (after line 172):

```javascript
// Debug: Check what URL scheme the app responds to
useEffect(() => {
  const checkLinking = async () => {
    const url = await Linking.getInitialURL();
    console.log('🔍 Initial URL on mount:', url);

    const parseUrl = Linking.parse('sabalist://auth?test=123');
    console.log('🔍 Parsed sabalist:// URL:', parseUrl);
  };
  checkLinking();
}, []);
```

Expected output:
```
🔍 Initial URL on mount: null (if not opened from link)
🔍 Parsed sabalist:// URL: { scheme: 'sabalist', path: 'auth', queryParams: { test: '123' } }
```

### Test Deep Link Manually (ADB)

```bash
# Test if app responds to deep links
adb shell am start -W -a android.intent.action.VIEW \
  -d "sabalist://auth?test=manual" \
  com.sabalist.app

# Expected: App opens and logs "📱 Deep link received: sabalist://auth?test=manual"
```

---

## COMMON ISSUES & SOLUTIONS

### Issue 1: `[auth/unauthorized-domain]` Error

**Symptom:**
```
Error: Domain not allowlisted by project
Code: auth/unauthorized-domain
```

**Cause:** Domain not in Firebase Authorized domains list

**Fix:**
1. Go to Firebase Console → Authentication → Settings
2. Add `sabalist.page.link` to Authorized domains
3. Wait 2 minutes
4. Try clicking email link again

### Issue 2: Browser Opens Instead of App

**Symptom:** Clicking email link opens Chrome/Firefox instead of app

**Cause 1:** Intent filters not applied (need to rebuild)
**Fix 1:**
```bash
eas build --platform android --profile development
# Reinstall the app
```

**Cause 2:** Firebase Dynamic Links not enabled
**Fix 2:**
1. Go to Firebase Console → Engage → Dynamic Links
2. Click "Get Started"
3. Create domain: `sabalist.page.link`

### Issue 3: App Opens But Doesn't Sign In

**Symptom:** App opens but stays on AuthScreen

**Cause:** Email not saved in AsyncStorage (testing from different device)

**Fix:**
1. Must click email link on SAME device where you requested it
2. Or manually enter email when prompted

### Issue 4: "Invalid Action Code"

**Symptom:**
```
Error: The action code is invalid. This can happen if the code is malformed, expired, or has already been used.
Code: auth/invalid-action-code
```

**Cause:** Email link expired (1 hour) or already used

**Fix:**
1. Request a new email link
2. Don't click the same link twice

---

## FINAL CONFIGURATION SUMMARY

### Firebase Console Settings:

**Authorized Domains:**
```
✅ localhost
✅ sabalist.page.link
✅ sabalist.web.app
✅ sabalist.firebaseapp.com
✅ [project-id].firebaseapp.com (default)
✅ [project-id].web.app (default)
```

### app.json Configuration:

```json
{
  "scheme": "sabalist",
  "android": {
    "package": "com.sabalist.app",
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          { "scheme": "https", "host": "sabalist.page.link" },
          { "scheme": "sabalist" }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

### AuthScreen.js Configuration:

```javascript
// Native (Android/iOS)
actionCodeSettings = {
  url: 'https://sabalist.page.link/auth',
  handleCodeInApp: true,
  android: { packageName: 'com.sabalist.app' },
  dynamicLinkDomain: 'sabalist.page.link',
}

// Deep link listeners
Linking.addEventListener('url', ({ url }) => handleDynamicLink(url));
Linking.getInitialURL().then((url) => { if (url) handleDynamicLink(url); });
```

---

## SUCCESS CRITERIA ✅

After authorizing domains in Firebase Console:

- ✅ Email link sent successfully
- ✅ Email contains `sabalist.page.link` URL
- ✅ Clicking link opens Sabalist app (not browser)
- ✅ App receives deep link via `expo-linking`
- ✅ Auth completes successfully
- ✅ User navigated to HomeScreen
- ✅ No `unauthorized-domain` error
- ✅ No "Site Not Found" error

---

## NEXT STEPS (IN ORDER)

1. **Authorize Domains in Firebase Console** (5 minutes)
   - Add `sabalist.page.link`
   - Add `localhost`
   - Add `sabalist.web.app`
   - Add `sabalist.firebaseapp.com`

2. **Wait 2 Minutes** (for Firebase to propagate changes)

3. **Test Email Link** (no rebuild needed)
   - Send email link from app
   - Click link from same device
   - Verify app opens and signs in

4. **Verify Success**
   - Check console logs
   - Confirm user signed in
   - Check no errors appear

---

## WHY NO CODE CHANGES NEEDED

Your code is already correctly configured:

✅ Action URL uses `sabalist.page.link`
✅ Intent filters include `sabalist.page.link`
✅ expo-linking is properly imported
✅ Deep link listeners are in place
✅ Email link handler validates and processes correctly

**The ONLY issue is Firebase Console configuration.**

Once you add the domains to Authorized domains in Firebase Console, everything will work immediately. No rebuild, no code changes, no waiting.

---

**Time to Fix:** 5 minutes (just Firebase Console setup)
**Rebuild Required:** NO
**Code Changes Required:** NO
**Firebase Hosting Required:** NO
**Works with Expo Go:** YES (after domain authorization)
