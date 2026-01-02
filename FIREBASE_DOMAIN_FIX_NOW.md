# FIX EMAIL LINK AUTH NOW - 5 MINUTE GUIDE

## THE PROBLEM

Error: `[auth/unauthorized-domain] Domain not allowlisted by project`

**Root Cause:** Firebase is blocking email links because `sabalist.page.link` is not in the Authorized Domains list.

---

## THE FIX (5 MINUTES)

### Step 1: Go to Firebase Console (1 min)

1. Open https://console.firebase.google.com
2. Click on your **Sabalist** project
3. Click **Authentication** (left sidebar, shield icon)
4. Click **Settings** tab (top of page)
5. Scroll down to **Authorized domains** section

### Step 2: Add These Domains (3 min)

Click **"Add domain"** button and add each of these:

```
sabalist.page.link
localhost
sabalist.web.app
sabalist.firebaseapp.com
```

**Visual Guide:**
```
Authorized domains
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Add domain] button

Already added:
✅ [your-project-id].firebaseapp.com
✅ [your-project-id].web.app

YOU NEED TO ADD:
⏳ sabalist.page.link         [Add domain]
⏳ localhost                   [Add domain]
⏳ sabalist.web.app           [Add domain]
⏳ sabalist.firebaseapp.com   [Add domain]
```

### Step 3: Wait 2 Minutes (1 min)

Firebase needs time to propagate the changes. Grab a coffee ☕

### Step 4: Test (No Rebuild Needed!)

1. Open your existing app (no rebuild required)
2. Send email link
3. Click link from email on same device
4. **Expected:** App opens and signs you in ✅

---

## EXACT DOMAINS TO ADD

Copy and paste these EXACTLY:

1. **`sabalist.page.link`** ← MOST IMPORTANT
   - This is what your email links use
   - Without this, you get the error

2. **`localhost`**
   - For local development testing
   - Allows testing on your computer

3. **`sabalist.web.app`**
   - Firebase Hosting default domain
   - For future web deployment

4. **`sabalist.firebaseapp.com`**
   - Firebase Hosting legacy domain
   - Fallback for web app

---

## WHY THIS FIXES THE PROBLEM

**Your code sends email links using:**
```javascript
url: 'https://sabalist.page.link/auth'
```

**Firebase checks:** Is `sabalist.page.link` in Authorized domains?
- **Before:** NO ❌ → Error: `[auth/unauthorized-domain]`
- **After:** YES ✅ → Email link works!

---

## VERIFICATION CHECKLIST

After adding domains, verify in Firebase Console:

```
Authorized domains
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ localhost
✅ sabalist.page.link
✅ sabalist.web.app
✅ sabalist.firebaseapp.com
✅ [project-id].firebaseapp.com (default)
✅ [project-id].web.app (default)
```

---

## TEST PROCEDURE

### Option 1: Test with Current App (No Rebuild)

```bash
# 1. No need to rebuild - your code is already correct!
# 2. Just authorize domains in Firebase Console
# 3. Wait 2 minutes
# 4. Open existing app on device
# 5. Send email link
# 6. Click email link
# 7. App should open and sign you in ✅
```

### Option 2: Test with Fresh Build

```bash
# If you want a fresh build anyway:
eas build --platform android --profile development

# Then:
# 1. Install the app
# 2. Send email link
# 3. Click email link
# 4. App should open and sign you in ✅
```

---

## EXPECTED RESULTS

### Before Fix:
```
User clicks email link
    ↓
❌ Error: [auth/unauthorized-domain]
❌ OR: Browser opens showing "Site Not Found"
```

### After Fix:
```
User clicks email link
    ↓
✅ App opens automatically
    ↓
Console logs:
📱 Deep link received: https://sabalist.page.link/auth?...
🔗 Checking URL for email link
🔍 Is valid email link: true
✅ Processing Firebase email link
🔐 Completing sign-in with email link...
✅ User signed in: [uid]
    ↓
✅ User sees HomeScreen (signed in)
```

---

## CONFIGURATION SUMMARY

### Current Code Configuration (ALREADY CORRECT ✅)

**Action URL:** [src/screens/AuthScreen.js:207](src/screens/AuthScreen.js#L207)
```javascript
url: 'https://sabalist.page.link/auth'
```

**Deep Linking:** [app.json:10, 36-62](app.json#L10)
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

**Expo Linking:** [src/screens/AuthScreen.js:15](src/screens/AuthScreen.js#L15)
```javascript
import * as Linking from 'expo-linking'; ✅
```

**Deep Link Listeners:** [src/screens/AuthScreen.js:157-170](src/screens/AuthScreen.js#L157-L170)
```javascript
Linking.addEventListener('url', ({ url }) => handleDynamicLink(url)); ✅
Linking.getInitialURL().then((url) => { if (url) handleDynamicLink(url); }); ✅
```

### Firebase Console Configuration (YOU NEED TO DO THIS)

**Authorized Domains:** (Add in Firebase Console → Authentication → Settings)
```
⏳ sabalist.page.link         ← ADD THIS
⏳ localhost                   ← ADD THIS
⏳ sabalist.web.app           ← ADD THIS
⏳ sabalist.firebaseapp.com   ← ADD THIS
```

---

## TROUBLESHOOTING

### Issue: Still Getting `unauthorized-domain` Error

**Cause:** Domain not added correctly or changes not propagated

**Fix:**
1. Double-check domain is in list (spelling must be exact)
2. Wait 2-5 minutes for Firebase to propagate
3. Try sending a NEW email link (old emails cached)

### Issue: Browser Opens Instead of App

**Cause 1:** Intent filters not applied (need rebuild)
**Fix:**
```bash
eas build --platform android --profile development
# Completely reinstall the app
```

**Cause 2:** Firebase Dynamic Links not enabled
**Fix:**
1. Go to Firebase Console → Engage → Dynamic Links
2. Click "Get Started"
3. Create domain: `sabalist.page.link`

### Issue: App Opens But Doesn't Sign In

**Cause:** Testing from different device than where you sent link

**Fix:**
1. Must click email link on SAME device where you requested it
2. Email is saved in AsyncStorage on that device
3. Or manually enter email when prompted

---

## WHY NO CODE CHANGES NEEDED

Your code configuration is **already perfect**:

✅ **Action URL correctly set** to `sabalist.page.link`
✅ **Expo scheme defined** as `sabalist`
✅ **Intent filters include** `sabalist.page.link`
✅ **expo-linking properly imported** (not native modules)
✅ **Deep link listeners** handle cold/warm start
✅ **Email link validation** with `isSignInWithEmailLink()`
✅ **Sign-in completion** with `signInWithEmailLink()`

**The ONLY missing piece is Firebase Console authorization.**

---

## FINAL CHECKLIST

- [ ] Go to Firebase Console → Authentication → Settings
- [ ] Add domain: `sabalist.page.link`
- [ ] Add domain: `localhost`
- [ ] Add domain: `sabalist.web.app`
- [ ] Add domain: `sabalist.firebaseapp.com`
- [ ] Wait 2 minutes
- [ ] Test email link (no rebuild needed)
- [ ] Verify app opens and signs in
- [ ] Celebrate! 🎉

---

## TIME ESTIMATE

- **Firebase Console Setup:** 5 minutes
- **Propagation Wait:** 2 minutes
- **Testing:** 2 minutes
- **Total:** ~10 minutes

**No rebuild required. No code changes. Just Firebase Console configuration.**

---

## NEXT STEPS

1. **RIGHT NOW:** Add domains to Firebase Console
2. **Wait 2 min:** Let Firebase propagate changes
3. **Test:** Send email link and click it
4. **Success:** App opens and signs you in ✅

---

**Full Technical Guide:** [FIREBASE_AUTH_DOMAIN_FIX.md](FIREBASE_AUTH_DOMAIN_FIX.md)
**Deep Link Flow:** [EMAIL_LINK_FLOW_DIAGRAM.md](EMAIL_LINK_FLOW_DIAGRAM.md)
**Dynamic Links Setup:** [FIREBASE_EMAIL_LINK_DEEP_LINK_SETUP.md](FIREBASE_EMAIL_LINK_DEEP_LINK_SETUP.md)
