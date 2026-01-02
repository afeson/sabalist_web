# QUICK FIX: Email Links Opening App Instead of "Site Not Found"

## The Problem
Email links were redirecting to `https://sabalist.firebaseapp.com` which shows "Site Not Found" because Firebase Hosting is not deployed.

## The Solution
Use Firebase Dynamic Links (`sabalist.page.link`) to deep link directly into the app.

---

## CODE CHANGES (ALREADY DONE ✅)

1. **Updated email action URL** in [src/screens/AuthScreen.js](src/screens/AuthScreen.js#L207)
   - Changed to: `https://sabalist.page.link/auth`

2. **Added intent filters** in [app.json](app.json#L43)
   - Added: `sabalist.page.link` to Android intent filters

3. **Deep linking already configured** in [src/screens/AuthScreen.js](src/screens/AuthScreen.js#L157-L170)
   - `expo-linking` listeners already in place ✅

---

## FIREBASE CONSOLE SETUP (YOU NEED TO DO THIS)

### Step 1: Enable Firebase Dynamic Links (2 minutes)

1. Go to https://console.firebase.google.com
2. Select your **Sabalist** project
3. Click **Engage** → **Dynamic Links** (left sidebar)
4. Click **Get Started**
5. Click **Add domain**
6. Enter: `sabalist.page.link`
7. Click **Add domain**

**Screenshot:** You should see "sabalist.page.link" listed with status "Active"

---

### Step 2: Update Email Template (CRITICAL - 1 minute)

1. Go to **Authentication** → **Templates** (left sidebar)
2. Click on **Email/password sign-in** template
3. Click the **Edit** (pencil) icon
4. Find **Action URL** field at the bottom
5. **Change from:**
   ```
   https://sabalist.firebaseapp.com/__/auth/action
   ```

   **Change to:**
   ```
   https://sabalist.page.link/auth
   ```

6. Click **Save**

**THIS IS THE KEY FIX!** This tells Firebase to send email links using Dynamic Links instead of Firebase Hosting.

---

## TEST THE FIX

### Step 1: Rebuild the App
```bash
# Development build for testing
eas build --platform android --profile development

# Or if you want production build
eas build --platform android --profile production
```

### Step 2: Install on Device
```bash
# Download the APK/AAB from EAS
# Install on your Android device or emulator
```

### Step 3: Test Email Link Flow

1. Open the app
2. Enter your email address
3. Click "Send Login Link"
4. Check your email on THE SAME DEVICE
5. Click the "Sign In" link in the email

**Expected Result:**
- ✅ App opens automatically (NOT browser)
- ✅ User is signed in immediately
- ✅ No "Site Not Found" error
- ✅ Console shows: "✅ User signed in: [uid]"

**Wrong Result (if Dynamic Links not configured):**
- ❌ Browser opens showing "Site Not Found"
- ❌ App doesn't open

---

## VERIFICATION CHECKLIST

- [ ] Firebase Dynamic Links enabled in console
- [ ] Domain `sabalist.page.link` created and active
- [ ] Email template action URL updated to `https://sabalist.page.link/auth`
- [ ] App rebuilt with latest changes
- [ ] Email link opens app (not browser)
- [ ] User signed in successfully

---

## HOW THE FLOW WORKS NOW

```
User enters email
    ↓
Firebase sends email with link:
https://sabalist.page.link/auth?apiKey=...&mode=signIn...
    ↓
User clicks link on Android device
    ↓
Firebase Dynamic Link detects:
- Is app installed? YES
    ↓
Opens app via deep link (sabalist://...)
    ↓
expo-linking receives deep link
    ↓
AuthScreen.js handles link:
- Validates with isSignInWithEmailLink() ✅
- Gets saved email from AsyncStorage
- Calls signInWithEmailLink(email, link)
    ↓
User signed in 🎉
```

---

## CONSOLE LOGS TO EXPECT

When email link is clicked and app opens:

```
📱 Deep link received: https://sabalist.page.link/auth?...
🔗 Checking URL for email link
🔍 Is valid email link: true
✅ Processing Firebase email link
🔐 Completing sign-in with email link...
   Email: user@example.com
   Link: https://sabalist.page.link/auth?...
✅ User signed in: abc123xyz
✅ Sign-in complete. Auth state listener will handle navigation.
```

---

## IF IT DOESN'T WORK

### Link Opens Browser Instead of App?

**Cause:** Dynamic Links not enabled in Firebase Console

**Fix:**
1. Complete "Step 1: Enable Firebase Dynamic Links" above
2. Rebuild the app
3. Reinstall completely (uninstall old version first)

### "Invalid Action Code" Error?

**Cause:** Email link expired or already used

**Fix:**
1. Request a new email link
2. Don't click the same link twice
3. Email links expire after a few hours

### "Site Not Found" Still Shows?

**Cause:** Email template still using old action URL

**Fix:**
1. Complete "Step 2: Update Email Template" above
2. Wait 5 minutes for Firebase to propagate changes
3. Send a NEW email link (old emails still have old URL)

---

## SUMMARY

**Code Changes:** ✅ Done
**Firebase Console Setup:** ⏳ YOU NEED TO DO THIS (5 minutes)
**Testing:** ⏳ After Firebase setup and rebuild

**Time Required:**
- Firebase Console Setup: 5 minutes
- App Rebuild: ~15 minutes
- Testing: 2 minutes

**Result:** Email links will open the app directly instead of showing "Site Not Found"

---

**Full detailed guide:** See [FIREBASE_EMAIL_LINK_DEEP_LINK_SETUP.md](FIREBASE_EMAIL_LINK_DEEP_LINK_SETUP.md)
