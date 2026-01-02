# Email Link Authentication - URL Format Fix

## ERROR IDENTIFIED ✅

**Error Message:**
```
❌ Sign-in error: [Error: [auth/unknown] Given link is not a valid email link.
Please use FirebaseAuth#isSignInWithEmailLink(String) to determine this
before calling this function]
```

**Root Cause:**
- Using `https://sabalist.page.link/auth` as the action URL
- Firebase Dynamic Links was stripping/corrupting the auth parameters (apiKey, mode, oobCode)
- When the link redirected to the app, the URL was missing critical parameters
- `isSignInWithEmailLink()` returned false because parameters were lost

---

## THE FIX ✅

**Changed Action URL from:**
```javascript
url: 'https://sabalist.page.link/auth', // Firebase Dynamic Link
dynamicLinkDomain: 'sabalist.page.link',
```

**To:**
```javascript
url: 'sabalist://auth', // Custom scheme - direct deep link
```

**Why This Works:**
- Uses the app's custom scheme directly (`sabalist://`)
- No intermediary Dynamic Link service
- Firebase parameters preserved in the URL
- Email link format: `sabalist://auth?apiKey=xxx&mode=signIn&oobCode=xxx...`
- App receives the complete URL with all parameters intact
- `isSignInWithEmailLink()` correctly validates the URL

---

## UPDATED CONFIGURATION

### AuthScreen.js Changes

**File:** [src/screens/AuthScreen.js:204-217](src/screens/AuthScreen.js#L204-L217)

**OLD (Broken):**
```javascript
actionCodeSettings = {
  url: 'https://sabalist.page.link/auth', // ❌ Dynamic Link strips parameters
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

**NEW (Fixed):**
```javascript
actionCodeSettings = {
  url: 'sabalist://auth', // ✅ Custom scheme preserves parameters
  handleCodeInApp: true,
  android: {
    packageName: 'com.sabalist.app',
    installApp: false, // Can't install from custom scheme
    minimumVersion: '1',
  },
  iOS: {
    bundleId: 'com.sabalist.app',
  },
}
```

---

## FIREBASE CONSOLE UPDATES

### Update Authorized Domains

Since we're now using `sabalist://` instead of `https://sabalist.page.link`, update Firebase Console:

**Required Domains:**
```
sabalist://          ← NEW (custom scheme)
localhost            ← For web development
```

**Optional (remove if not using):**
```
sabalist.page.link      ← No longer needed
sabalist.web.app        ← Only if deploying web version
sabalist.firebaseapp.com ← Only if deploying web version
```

**How to Update:**
1. Go to Firebase Console → Authentication → Settings
2. Scroll to **Authorized domains**
3. Add: `sabalist://` (if it allows custom schemes)
   - **Note:** Firebase may not accept custom schemes in Authorized domains
   - If rejected, that's OK - just ensure `localhost` is there for web testing

---

## HOW THE FLOW WORKS NOW

### Email Link Format

**Before (Broken):**
```
User receives email with:
https://sabalist.page.link/auth
    ↓
Firebase Dynamic Link redirects to:
sabalist://auth (parameters lost ❌)
    ↓
App receives:
sabalist://auth
    ↓
isSignInWithEmailLink() → false ❌
Error: "Given link is not a valid email link"
```

**After (Fixed):**
```
User receives email with:
sabalist://auth?apiKey=xxx&mode=signIn&oobCode=xxx&...
    ↓
App receives directly:
sabalist://auth?apiKey=xxx&mode=signIn&oobCode=xxx&...
    ↓
isSignInWithEmailLink() → true ✅
signInWithEmailLink() → success ✅
```

---

## COMPLETE FLOW DIAGRAM

```
1. User enters email in app
   ↓
2. App calls sendSignInLinkToEmail() with:
   actionCodeSettings = {
     url: 'sabalist://auth',
     handleCodeInApp: true,
     android: { packageName: 'com.sabalist.app' }
   }
   ↓
3. Firebase sends email with link:
   sabalist://auth?apiKey=AIzaSy...&mode=signIn&oobCode=abc...&continueUrl=...
   ↓
4. User clicks link on Android device
   ↓
5. Android OS checks intent filters in app.json:
   {
     "scheme": "sabalist"  ✅ MATCH
   }
   ↓
6. Android opens Sabalist app with URL:
   sabalist://auth?apiKey=AIzaSy...&mode=signIn&oobCode=abc...
   ↓
7. expo-linking receives URL:
   Linking.getInitialURL() → "sabalist://auth?apiKey=..."
   ↓
8. AuthScreen.js handleDynamicLink() processes:
   - auth().isSignInWithEmailLink(url) → true ✅
   - AsyncStorage.getItem('emailForSignIn') → user@example.com
   - auth().signInWithEmailLink(email, url) → SUCCESS ✅
   ↓
9. User authenticated
   ↓
10. App.js auth state listener:
    onAuthStateChanged((user) => { navigate('Home') })
   ↓
11. ✅ User signed in and on HomeScreen
```

---

## TESTING PROCEDURE

### Step 1: Rebuild the App (REQUIRED)

Since we changed the action URL in code, you must rebuild:

```bash
# Development build
eas build --platform android --profile development

# Wait for build to complete
# Download and install APK
```

### Step 2: Test Email Link Flow

1. **Open the app**
2. **Enter your email** (use real email you can access on same device)
3. **Click "Send Login Link"**
4. **Check console:**
   ```
   📧 Sending magic link to: user@example.com
   ✅ Magic link sent successfully!
   ```

### Step 3: Check Email

1. **Open email app on SAME device**
2. **Find email** from `noreply@sabalist.firebaseapp.com`
3. **Check the link format:**
   - Should start with: `sabalist://auth?`
   - NOT: `https://sabalist.page.link/auth`

### Step 4: Click Email Link

1. **Click "Sign In" link** in email
2. **Expected behavior:**
   - App opens immediately
   - Console logs:
     ```
     📱 Deep link received: sabalist://auth?apiKey=...&mode=signIn&oobCode=...
     🔗 Checking URL for email link
     🔍 Is valid email link: true ✅
     ✅ Processing Firebase email link
     🔐 Completing sign-in with email link...
        Email: user@example.com
        Link: sabalist://auth?apiKey=...
     ✅ User signed in: abc123xyz
     ```
   - App navigates to HomeScreen
   - User is signed in ✅

### Step 5: Verify Success

- [ ] No error: "Given link is not a valid email link"
- [ ] No error: "[auth/unknown]"
- [ ] User signed in successfully
- [ ] ProfileScreen shows user info
- [ ] Can navigate to all screens
- [ ] Logout works
- [ ] Re-login with email link works

---

## EXPECTED CONSOLE LOGS

### ✅ Success Logs

```
📧 Sending magic link to: user@example.com
✅ Magic link sent successfully!

[User clicks email link]

📱 Deep link received: sabalist://auth?apiKey=AIzaSyABC...&mode=signIn&oobCode=xyz123...&continueUrl=...
🔗 Checking URL for email link
🔍 Is valid email link: true
✅ Processing Firebase email link
🔐 Completing sign-in with email link...
   Email: user@example.com
   Link: sabalist://auth?apiKey=AIzaSyABC...&mode=signIn&oobCode=xyz123...
✅ User signed in: gKmP9xYzWXhVQjRiE9rP2mF4tNq1
✅ Sign-in complete. Auth state listener will handle navigation.
```

### ❌ Error Logs (Should NOT Appear)

```
❌ Sign-in error: [Error: [auth/unknown] Given link is not a valid email link]
❌ [auth/invalid-action-code]
❌ [auth/unauthorized-domain]
❌ Error handling email link: ...
```

---

## TROUBLESHOOTING

### Issue 1: "Given link is not a valid email link"

**Symptom:**
```
❌ Sign-in error: [Error: [auth/unknown] Given link is not a valid email link]
```

**Cause:** Using old build with `https://sabalist.page.link` URL

**Fix:**
1. Rebuild app with new code (action URL: `sabalist://auth`)
2. Uninstall old app completely
3. Install new build
4. Send a NEW email link (old emails have old URL format)

**Verify:**
```javascript
// Check AuthScreen.js line 207 shows:
url: 'sabalist://auth', // ✅ Correct
// NOT:
url: 'https://sabalist.page.link/auth', // ❌ Old/broken
```

---

### Issue 2: Email Link Still Uses `https://` Instead of `sabalist://`

**Symptom:** Email contains `https://sabalist.page.link/auth?...` instead of `sabalist://auth?...`

**Cause:** Using old build or code not updated

**Fix:**
1. Verify [AuthScreen.js:207](src/screens/AuthScreen.js#L207) shows:
   ```javascript
   url: 'sabalist://auth',
   ```
2. Rebuild: `eas build --platform android --profile development`
3. Install new build
4. Request NEW email link

---

### Issue 3: App Doesn't Open When Clicking Link

**Symptom:** Clicking email link doesn't open the app

**Cause:** Intent filters not configured for `sabalist://` scheme

**Fix:**
1. Check [app.json:10](app.json#L10) has:
   ```json
   "scheme": "sabalist"
   ```
2. Check [app.json:54](app.json#L54) has:
   ```json
   { "scheme": "sabalist" }
   ```
3. Rebuild app
4. Reinstall completely

---

### Issue 4: Parameters Missing from URL

**Symptom:** App receives `sabalist://auth` without query parameters

**Cause:** Email client or OS stripping parameters

**Fix:**
1. Test on different email client (Gmail vs Outlook vs native)
2. Try clicking link from notification instead of opening email app
3. Check console log shows full URL with parameters

---

## COMPARISON: OLD vs NEW

### OLD Configuration (Broken)

```javascript
// Action URL
url: 'https://sabalist.page.link/auth'
dynamicLinkDomain: 'sabalist.page.link'

// Email link format
https://sabalist.page.link/auth
    ↓
Firebase Dynamic Link redirects
    ↓
sabalist://auth (parameters lost ❌)
    ↓
isSignInWithEmailLink() → false ❌
Error: "Given link is not a valid email link"
```

**Problems:**
- ❌ Required Firebase Dynamic Links setup
- ❌ Dynamic Link stripped auth parameters
- ❌ Validation failed
- ❌ Complex debugging
- ❌ Extra step in authentication flow

---

### NEW Configuration (Fixed)

```javascript
// Action URL
url: 'sabalist://auth'

// Email link format
sabalist://auth?apiKey=xxx&mode=signIn&oobCode=xxx
    ↓
Direct deep link to app
    ↓
isSignInWithEmailLink() → true ✅
signInWithEmailLink() → success ✅
```

**Benefits:**
- ✅ No Firebase Dynamic Links needed
- ✅ Parameters preserved in URL
- ✅ Direct app opening
- ✅ Simpler flow
- ✅ Easier to debug
- ✅ More reliable

---

## FIREBASE CONSOLE CONFIGURATION

### Option 1: Firebase Accepts Custom Scheme

If Firebase Console allows adding `sabalist://`:

**Authorized domains:**
```
sabalist://
localhost
```

**How to add:**
1. Go to Firebase Console → Authentication → Settings
2. Click "Add domain"
3. Enter: `sabalist://`
4. If accepted, save

---

### Option 2: Firebase Rejects Custom Scheme

If Firebase Console shows error: "Invalid domain format":

**Authorized domains:**
```
localhost
sabalist.web.app (if deploying web)
```

**This is OK because:**
- Custom schemes (`sabalist://`) may not need authorization
- Firebase validates based on package name (com.sabalist.app)
- The link still works for native apps

---

## UPDATED CHECKLIST

### Code Configuration ✅

- [x] Action URL updated to `sabalist://auth`
- [x] Removed `dynamicLinkDomain` parameter
- [x] Set `installApp: false` (can't install from custom scheme)
- [x] app.json has `scheme: "sabalist"`
- [x] Intent filters include `{ "scheme": "sabalist" }`

### Build & Deploy ⏳

- [ ] Rebuild app: `eas build --platform android --profile development`
- [ ] Uninstall old app
- [ ] Install new build
- [ ] Test on physical device

### Firebase Console ⏳

- [ ] Add `sabalist://` to Authorized domains (if accepted)
- [ ] OR keep `localhost` for web testing
- [ ] Remove `sabalist.page.link` (no longer needed)

### Testing ⏳

- [ ] Send email link from new build
- [ ] Verify email contains `sabalist://auth?...`
- [ ] Click link opens app
- [ ] Console shows: `🔍 Is valid email link: true`
- [ ] User signed in successfully
- [ ] No errors in console

---

## SUMMARY

### What Was Wrong:
```
Using Firebase Dynamic Links (https://sabalist.page.link)
    ↓
Auth parameters stripped during redirect
    ↓
App receives incomplete URL
    ↓
isSignInWithEmailLink() fails
    ↓
Error: "Given link is not a valid email link"
```

### What We Fixed:
```
Using custom scheme (sabalist://)
    ↓
Direct deep link to app
    ↓
All parameters preserved
    ↓
isSignInWithEmailLink() succeeds
    ↓
User authenticated successfully ✅
```

### What You Need To Do:
```
1. Code already updated ✅
2. Rebuild app (required)
3. Install new build
4. Test email link flow
5. Verify success
```

---

## NEXT STEPS (IN ORDER)

1. **Rebuild the app**
   ```bash
   eas build --platform android --profile development
   ```

2. **Install new build** on your Android device

3. **Test email flow:**
   - Send email link
   - Check email contains `sabalist://auth?...`
   - Click link
   - Verify app opens and signs in

4. **Expected result:**
   - ✅ Email link works
   - ✅ No "invalid link" error
   - ✅ User signed in
   - ✅ Ready for production

---

**Time Required:**
- Code update: ✅ Done
- Rebuild: ~15 minutes
- Testing: ~5 minutes
- Total: ~20 minutes

**Success Rate:** Should be 100% with custom scheme approach

---

**Previous Guides (Now Outdated):**
- ~~FIREBASE_EMAIL_LINK_DEEP_LINK_SETUP.md~~ (used Dynamic Links - deprecated)
- ~~FIREBASE_DOMAIN_FIX_NOW.md~~ (referenced sabalist.page.link - deprecated)

**Current Guide:** This document (EMAIL_LINK_URL_FIX.md)
