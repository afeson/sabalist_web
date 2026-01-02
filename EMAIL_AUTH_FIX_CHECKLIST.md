# Email Link Authentication - Complete Fix Checklist

## ROOT CAUSE ✅ IDENTIFIED

**Error:** `[auth/unauthorized-domain] Domain not allowlisted by project`

**Exact Issue:**
- Your code uses: `https://sabalist.page.link/auth`
- Firebase Authorized Domains doesn't include: `sabalist.page.link`
- Result: Firebase blocks the email link

**Solution:** Add domains to Firebase Console (5 minutes, no rebuild needed)

---

## CONFIGURATION AUDIT

### ✅ Code Configuration (VERIFIED - NO CHANGES NEEDED)

| Component | Status | Location | Details |
|-----------|--------|----------|---------|
| **Action URL (Native)** | ✅ CORRECT | [AuthScreen.js:207](src/screens/AuthScreen.js#L207) | `https://sabalist.page.link/auth` |
| **Action URL (Web)** | ✅ CORRECT | [AuthScreen.js:198](src/screens/AuthScreen.js#L198) | `window.location.origin` |
| **Expo Scheme** | ✅ CORRECT | [app.json:10](app.json#L10) | `sabalist` |
| **Android Package** | ✅ CORRECT | [app.json:29](app.json#L29) | `com.sabalist.app` |
| **Intent Filters** | ✅ CORRECT | [app.json:36-62](app.json#L36-L62) | Includes `sabalist.page.link` |
| **expo-linking Import** | ✅ CORRECT | [AuthScreen.js:15](src/screens/AuthScreen.js#L15) | `import * as Linking from 'expo-linking'` |
| **Deep Link Listeners** | ✅ CORRECT | [AuthScreen.js:157-170](src/screens/AuthScreen.js#L157-L170) | Handles cold/warm start |
| **Email Validation** | ✅ CORRECT | [AuthScreen.js:62](src/screens/AuthScreen.js#L62) | `isSignInWithEmailLink()` |
| **Sign-In Handler** | ✅ CORRECT | [AuthScreen.js:128](src/screens/AuthScreen.js#L128) | `signInWithEmailLink()` |

**Conclusion:** All code is correctly configured. No changes needed.

---

### ⏳ Firebase Console Configuration (YOU MUST DO THIS)

| Domain | Status | Purpose | Priority |
|--------|--------|---------|----------|
| **sabalist.page.link** | ⏳ TO ADD | Email link action URL | 🔴 CRITICAL |
| **localhost** | ⏳ TO ADD | Local development | 🟡 HIGH |
| **sabalist.web.app** | ⏳ TO ADD | Firebase Hosting | 🟢 MEDIUM |
| **sabalist.firebaseapp.com** | ⏳ TO ADD | Firebase Hosting legacy | 🟢 MEDIUM |

**How to Add:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **Sabalist** project
3. **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"** for each domain above

---

## FIREBASE CONSOLE STEP-BY-STEP

### Visual Guide

```
Firebase Console
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Click "Authentication" (left sidebar)
   ├─ Users
   ├─ Sign-in method
   └─ Settings ← CLICK HERE

2. Scroll to "Authorized domains"

   Authorized domains
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   These domains are authorized for OAuth redirects and
   email link sign-in.

   [Add domain] button ← CLICK THIS

   Already authorized:
   ✅ your-project-id.firebaseapp.com
   ✅ your-project-id.web.app

3. Add each domain:

   Add authorized domain
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Domain: [sabalist.page.link        ]

   [Cancel]  [Add] ← CLICK ADD

4. Repeat for all domains:
   - sabalist.page.link
   - localhost
   - sabalist.web.app
   - sabalist.firebaseapp.com

5. Final result:

   Authorized domains
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ✅ localhost
   ✅ sabalist.page.link
   ✅ sabalist.web.app
   ✅ sabalist.firebaseapp.com
   ✅ your-project-id.firebaseapp.com
   ✅ your-project-id.web.app
```

---

## EXACT DOMAINS TO ADD

### 1. sabalist.page.link (CRITICAL)

**Copy this EXACTLY:**
```
sabalist.page.link
```

**Why:**
- This is the action URL in your email links
- Without this, Firebase blocks email auth
- **This is the main fix for your error**

**Used by:**
```javascript
// src/screens/AuthScreen.js:207
url: 'https://sabalist.page.link/auth'
```

---

### 2. localhost (RECOMMENDED)

**Copy this EXACTLY:**
```
localhost
```

**Why:**
- Allows testing email links in local development
- Works with `http://localhost:8081` (Expo web)

**Used by:**
```javascript
// src/screens/AuthScreen.js:198 (web only)
const currentUrl = window.location.origin; // http://localhost:8081
```

---

### 3. sabalist.web.app (OPTIONAL - FOR FUTURE)

**Copy this EXACTLY:**
```
sabalist.web.app
```

**Why:**
- Firebase Hosting default domain
- For when you deploy web version

**Used by:**
- Future web deployment
- Already in intent filters for deep linking

---

### 4. sabalist.firebaseapp.com (OPTIONAL - FOR FUTURE)

**Copy this EXACTLY:**
```
sabalist.firebaseapp.com
```

**Why:**
- Firebase Hosting legacy domain
- Fallback for web app

**Used by:**
- Future web deployment
- Already in intent filters for deep linking

---

## TESTING CHECKLIST

### ✅ Pre-Test Verification

Before testing, verify these are done:

- [ ] Added `sabalist.page.link` to Firebase Authorized domains
- [ ] Added `localhost` to Firebase Authorized domains
- [ ] Added `sabalist.web.app` to Firebase Authorized domains
- [ ] Added `sabalist.firebaseapp.com` to Firebase Authorized domains
- [ ] Waited 2-5 minutes for Firebase to propagate changes

### ✅ Test Procedure

1. **Send Email Link**
   - [ ] Open app on Android device
   - [ ] Enter email address
   - [ ] Click "Send Login Link"
   - [ ] Verify console shows: `✅ Magic link sent successfully!`
   - [ ] Check email inbox

2. **Verify Email**
   - [ ] Email received from `noreply@sabalist.firebaseapp.com`
   - [ ] Subject: "Sign in to Sabalist"
   - [ ] Link starts with: `https://sabalist.page.link/auth?`
   - [ ] Link does NOT show `sabalist.firebaseapp.com` (old URL)

3. **Click Email Link (App Running)**
   - [ ] App is running in background
   - [ ] Click "Sign In" link in email
   - [ ] App comes to foreground (doesn't open browser)
   - [ ] Console shows:
     ```
     📱 Deep link received: https://sabalist.page.link/auth?...
     🔗 Checking URL for email link
     🔍 Is valid email link: true
     ✅ Processing Firebase email link
     🔐 Completing sign-in with email link...
     ✅ User signed in: [uid]
     ```
   - [ ] App navigates to HomeScreen
   - [ ] User profile shows in ProfileScreen

4. **Click Email Link (Cold Start)**
   - [ ] Force close app completely
   - [ ] Click "Sign In" link in email again
   - [ ] App launches (doesn't open browser)
   - [ ] Same console logs as above
   - [ ] App navigates to HomeScreen
   - [ ] User is signed in

### ✅ Success Criteria

All of these must be true:

- [ ] ✅ No `[auth/unauthorized-domain]` error
- [ ] ✅ No "Site Not Found" in browser
- [ ] ✅ Email link opens app (not browser)
- [ ] ✅ App receives deep link via expo-linking
- [ ] ✅ User automatically signed in
- [ ] ✅ App navigates to HomeScreen
- [ ] ✅ User can access protected screens
- [ ] ✅ Logout works
- [ ] ✅ Re-login with email link works

---

## EXPECTED CONSOLE LOGS

### ✅ Sending Email Link

```
📧 Sending magic link to: user@example.com
✅ Magic link sent successfully!
```

### ✅ Receiving Deep Link

```
📱 Deep link received: https://sabalist.page.link/auth?apiKey=xxx&mode=signIn&oobCode=xxx...
🔗 Checking URL for email link
```

### ✅ Validating Email Link

```
🔍 Is valid email link: true
✅ Processing Firebase email link
```

### ✅ Completing Sign-In

```
🔐 Completing sign-in with email link...
   Email: user@example.com
   Link: https://sabalist.page.link/auth?apiKey=xxx...
✅ User signed in: abc123xyz456
✅ Sign-in complete. Auth state listener will handle navigation.
```

### ❌ Error Logs (Should NOT Appear)

```
❌ [auth/unauthorized-domain] Domain not allowlisted by project
❌ [auth/invalid-action-code] The action code is invalid
❌ Error handling email link: ...
```

---

## COMMON ERRORS & FIXES

### Error 1: `[auth/unauthorized-domain]`

**What you see:**
```
Error: The domain of the continue URL is not whitelisted.
Code: auth/unauthorized-domain
```

**Cause:** `sabalist.page.link` not in Firebase Authorized domains

**Fix:**
1. Go to Firebase Console → Authentication → Settings
2. Add `sabalist.page.link` to Authorized domains
3. Wait 2 minutes
4. Try again

**Verify:**
```bash
# Check Firebase Console shows:
✅ sabalist.page.link (in Authorized domains list)
```

---

### Error 2: Browser Opens Instead of App

**What you see:**
- Chrome/Firefox opens
- Shows Firebase page or "Site Not Found"

**Cause 1:** Intent filters not applied (need rebuild)

**Fix 1:**
```bash
eas build --platform android --profile development
# Completely uninstall old app
# Install new build
```

**Cause 2:** Firebase Dynamic Links not enabled

**Fix 2:**
1. Go to Firebase Console → Engage → Dynamic Links
2. Click "Get Started"
3. Create domain: `sabalist.page.link`
4. Save

**Verify:**
```bash
# Check app.json has:
"intentFilters": [
  {
    "data": [
      { "scheme": "https", "host": "sabalist.page.link" }
    ]
  }
]
```

---

### Error 3: `[auth/invalid-action-code]`

**What you see:**
```
Error: The action code is invalid. This can happen if the code is
malformed, expired, or has already been used.
Code: auth/invalid-action-code
```

**Cause:** Email link expired (after 1 hour) or already used

**Fix:**
1. Request a new email link
2. Don't click the same link twice
3. Use the link within 1 hour

**Verify:**
```bash
# Check email timestamp
# If older than 1 hour, request new link
```

---

### Error 4: App Opens But Doesn't Sign In

**What you see:**
- App opens successfully
- No errors in console
- Still on AuthScreen (not signed in)

**Cause:** Email not saved in AsyncStorage (wrong device)

**Fix:**
1. Must use SAME device for both:
   - Sending email link (saves email to AsyncStorage)
   - Clicking email link (retrieves email from AsyncStorage)
2. If testing on different device, you'll be prompted to enter email

**Verify:**
```javascript
// Check console for:
Get email from storage
   savedEmail: user@example.com ✅

// If shows null:
   savedEmail: null ❌
// You'll be prompted to enter email manually
```

---

## REBUILD REQUIRED?

### ❌ NO - If Only Fixing Firebase Console

**Scenario:** You haven't changed any code, just need to authorize domains

**What to do:**
1. Add domains to Firebase Console
2. Wait 2 minutes
3. Test with existing app ✅

**No rebuild needed because:**
- Code already uses `sabalist.page.link` ✅
- Intent filters already configured ✅
- expo-linking already in place ✅

---

### ✅ YES - If You Changed Code or app.json

**Scenario:** You modified code or app.json

**What to do:**
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

**Rebuild needed because:**
- app.json changes require new build
- Intent filters need to be applied to APK/AAB
- Code changes need to be compiled

---

## FINAL SUMMARY

### What's Wrong Right Now:

```
❌ Firebase Authorized Domains missing: sabalist.page.link
❌ Email links get blocked by Firebase
❌ Error: [auth/unauthorized-domain]
```

### What You Need To Do:

```
1. Add sabalist.page.link to Firebase Console (5 min)
2. Wait 2 minutes for propagation
3. Test email link (no rebuild needed)
```

### What Will Happen After Fix:

```
✅ Email links allowed by Firebase
✅ App opens when link clicked
✅ User automatically signed in
✅ No errors
```

---

## CONFIRMATION STEPS

After completing the fix, confirm these:

### Firebase Console Confirmation:

```
Firebase Console → Authentication → Settings → Authorized domains

✅ localhost
✅ sabalist.page.link
✅ sabalist.web.app
✅ sabalist.firebaseapp.com
✅ [project-id].firebaseapp.com
✅ [project-id].web.app
```

### Code Confirmation (Already Done):

```javascript
// AuthScreen.js:207
✅ url: 'https://sabalist.page.link/auth'

// app.json:10
✅ "scheme": "sabalist"

// app.json:43
✅ { "scheme": "https", "host": "sabalist.page.link" }

// AuthScreen.js:15
✅ import * as Linking from 'expo-linking';
```

### Test Confirmation:

```
✅ Email link sent successfully
✅ Email link clicks open app
✅ User automatically signed in
✅ No unauthorized-domain error
✅ No Site Not Found error
```

---

## TIME ESTIMATE

| Task | Time | Required |
|------|------|----------|
| Add domains to Firebase Console | 5 min | ✅ YES |
| Wait for propagation | 2 min | ✅ YES |
| Test email link flow | 2 min | ✅ YES |
| Rebuild app (if needed) | 15 min | ❌ NO (unless code changed) |
| **Total** | **~10 min** | |

---

## NEXT STEPS (IN ORDER)

1. **RIGHT NOW:** Go to Firebase Console
2. **Add domains:** `sabalist.page.link`, `localhost`, `sabalist.web.app`, `sabalist.firebaseapp.com`
3. **Wait 2 min:** Let Firebase propagate
4. **Test:** Send email link and click it
5. **Verify:** App opens and signs you in
6. **Done!** 🎉

---

**Quick Guide:** [FIREBASE_DOMAIN_FIX_NOW.md](FIREBASE_DOMAIN_FIX_NOW.md)
**Technical Details:** [FIREBASE_AUTH_DOMAIN_FIX.md](FIREBASE_AUTH_DOMAIN_FIX.md)
**Flow Diagram:** [EMAIL_LINK_FLOW_DIAGRAM.md](EMAIL_LINK_FLOW_DIAGRAM.md)
