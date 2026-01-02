# ⚡ Quick Fix: Google Sign-In Module Error

## 🔴 Error
```
Module @react-native-google-signin/google-signin cannot be resolved
```

---

## ✅ Fix (PowerShell)

Copy and paste these commands **in order**:

```powershell
# 1. Navigate to project
cd c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval

# 2. Clean installation
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 3. Install dependencies with Expo
npx expo install

# 4. Install Google Sign-In (CRITICAL - use expo install, not npm install)
npx expo install @react-native-google-signin/google-signin

# 5. Verify installation
npm list @react-native-google-signin/google-signin

# 6. Clean prebuild
npx expo prebuild --clean

# 7. Build and run
npx expo run:android
```

---

## ⏱️ Time: 5-9 minutes

---

## ✅ Success Check

After commands complete:

- [x] No "cannot resolve module" errors
- [x] App builds successfully
- [x] Google Sign-In button appears
- [x] Can tap button without crash

---

## 🐛 If Still Failing

### Clear Metro cache:
```powershell
npx expo start --clear
```

### Clean gradle:
```powershell
cd android
.\gradlew clean
cd ..
npx expo prebuild --clean
npx expo run:android
```

---

## 📚 Full Guide

See [FIX_GOOGLE_SIGNIN_MODULE.md](FIX_GOOGLE_SIGNIN_MODULE.md) for detailed explanation and troubleshooting.

---

## 🎯 Key Point

**ALWAYS use `npx expo install` for native modules, NOT `npm install`**

- ❌ `npm install @react-native-google-signin/google-signin` → Module errors
- ✅ `npx expo install @react-native-google-signin/google-signin` → Works

---

**Run commands above → Rebuild → Test!** 🚀
