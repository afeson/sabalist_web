# ⚡ QUICK FIX CHECKLIST - Email Auth Deep Linking

## ✅ CODE CHANGES (DONE)

- [x] app.json - Android intent filters updated
- [x] App.js - Deep linking configuration added
- [x] AuthScreen.js - URL processing simplified

---

## 🔧 REQUIRED ACTIONS

### 1. FIREBASE CONSOLE (DO THIS NOW)

**Verify Email Auth is Enabled:**
1. Open: https://console.firebase.google.com/project/sabalist/authentication/providers
2. Click **Email/Password**
3. Ensure **Email link (passwordless sign-in)** is ✅ ENABLED
4. Save if you made changes

**Verify Authorized Domains:**
1. Go to: https://console.firebase.google.com/project/sabalist/authentication/settings
2. Click **Authorized domains** tab
3. Confirm these domains are listed:
   - ✅ `sabalist.firebaseapp.com`
   - ✅ `sabalist.web.app`
   - ✅ `localhost` (for testing)

---

### 2. REBUILD APP (REQUIRED)

**You MUST rebuild because intent filters changed in app.json**

```bash
# Development build (for testing)
eas build --platform android --profile development

# OR Production build
eas build --platform android --profile production
```

**Wait for build to complete** (check status at expo.dev)

---

### 3. INSTALL & TEST

```bash
# Download APK from EAS
# Then install:
adb install path/to/sabalist-dev.apk

# OR if you have the APK URL:
adb install-multiple $(eas build:download --platform android --latest)
```

**Clear any previous app data:**
```bash
adb shell pm clear com.sabalist.app
```

---

### 4. TEST THE AUTH FLOW

1. **Open Sabalist app**
2. **Enter email address**
3. **Click "Send Login Link"**
4. **Check your email**
5. **Click the login link**

**EXPECTED:** App opens directly and signs you in ✅

**OLD BEHAVIOR:** Browser opens, shows error ❌

---

## 🐛 IF IT DOESN'T WORK

### Check 1: Is new build installed?

```bash
adb shell dumpsys package com.sabalist.app | grep versionName
# Should show: versionName=1.1.0 or higher
```

### Check 2: Clear app defaults

```bash
adb shell pm clear com.sabalist.app
# This clears cached data and forces fresh start
```

### Check 3: View logs

```bash
adb logcat -c  # Clear logs
adb logcat | grep -E "(🔗|AUTH|Deep link)"
```

**Then click the email link and watch the logs**

Expected logs:
```
🔗 Received URL: https://sabalist.firebaseapp.com/__/auth/action?...
✅ Received HTTPS URL (expected for auth links)
✅ Valid Firebase email link confirmed!
✅ User signed in
```

### Check 4: Test intent manually

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://sabalist.firebaseapp.com/__/auth/action?mode=test" \
  com.sabalist.app
```

**Expected:** App should open

---

## 📱 VERIFICATION COMMANDS

### Check installed intent filters:

```bash
adb shell dumpsys package com.sabalist.app | grep -A 10 "android.intent.action.VIEW"
```

**Should show:**
- `scheme: "https" host: "sabalist.firebaseapp.com" pathPrefix: "/__/auth/action"`
- `scheme: "https" host: "sabalist.web.app"`
- `scheme: "sabalist"`

### Check App Links status:

```bash
adb shell dumpsys package domain-preferred-apps | grep sabalist
```

---

## 🎯 SUCCESS CRITERIA

✅ Click email link → App opens (not browser)
✅ User is signed in automatically
✅ No "make sure app is installed" error
✅ No browser redirect loop

---

## 🚨 COMMON MISTAKES TO AVOID

❌ Testing with old build (intent filters won't work)
❌ Forgetting to enable "Email link" in Firebase Console
❌ Not clearing app data between tests
❌ Using wrong email (check spam folder)

---

## 📞 STILL STUCK?

Run this diagnostic:

```bash
echo "=== SABALIST AUTH DEBUG ==="
echo "1. App Version:"
adb shell dumpsys package com.sabalist.app | grep versionName
echo ""
echo "2. Intent Filters:"
adb shell dumpsys package com.sabalist.app | grep -A 5 "sabalist.firebaseapp.com"
echo ""
echo "3. Test Link:"
adb shell am start -a android.intent.action.VIEW \
  -d "https://sabalist.firebaseapp.com/__/auth/action" \
  com.sabalist.app
echo ""
echo "4. Live Logs:"
adb logcat -c
adb logcat | grep -E "(AUTH|Deep link|Received URL)"
```

Then send the output for debugging.

---

Last Updated: 2026-01-01
