# 🔧 Fix Google Sign-In Module Resolution Error

## 🔴 Error

```
Android bundling failed
Module @react-native-google-signin/google-signin cannot be resolved
```

## 🎯 Root Cause

Package was added to `package.json` manually (via `npm install`), but Expo Dev Client requires packages to be installed with `npx expo install` for proper native module integration.

---

## ✅ Fix: Install with Expo Tooling

### PowerShell Commands (Windows)

Open PowerShell in your project directory and run these commands **in order**:

```powershell
# Step 1: Navigate to project directory
cd c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval

# Step 2: Clean node_modules and lock files
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Step 3: Install all dependencies with Expo
npx expo install

# Step 4: Install Google Sign-In with Expo (CRITICAL)
npx expo install @react-native-google-signin/google-signin

# Step 5: Verify installation
npm list @react-native-google-signin/google-signin

# Step 6: Clean prebuild
npx expo prebuild --clean

# Step 7: Run on Android
npx expo run:android
```

---

## 📋 Step-by-Step Explanation

### Step 1: Clean Installation

**Why?** Removes conflicting installations from manual `npm install`.

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
```

**What it does:**
- Deletes `node_modules` folder
- Deletes `package-lock.json`
- Ensures fresh installation

---

### Step 2: Base Dependencies

**Why?** Reinstalls all existing dependencies properly.

```powershell
npx expo install
```

**What it does:**
- Reads `package.json`
- Installs all dependencies
- Uses Expo-compatible versions

---

### Step 3: Install Google Sign-In (CRITICAL)

**Why?** Uses Expo's installer to ensure compatibility with Expo Dev Client.

```powershell
npx expo install @react-native-google-signin/google-signin
```

**What it does:**
- Installs Expo-compatible version
- Configures autolinking properly
- Adds to `package.json` correctly

**Key Difference:**
- ❌ `npm install` → Manual version, may conflict
- ✅ `npx expo install` → Expo-managed version, guaranteed compatible

---

### Step 4: Verify Installation

**Why?** Confirms package is installed correctly.

```powershell
npm list @react-native-google-signin/google-signin
```

**Expected output:**
```
sabalist@1.1.0 c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval
└── @react-native-google-signin/google-signin@x.x.x
```

---

### Step 5: Rebuild Native Code

**Why?** Native modules require rebuild to link properly.

```powershell
npx expo prebuild --clean
```

**What it does:**
- Regenerates `android/` and `ios/` directories
- Links native modules
- Updates gradle configs
- Copies `google-services.json`

---

### Step 6: Build and Run

**Why?** Compiles app with new native module.

```powershell
npx expo run:android
```

**What it does:**
- Builds Android APK
- Installs on device/emulator
- Starts Metro bundler
- Launches app

---

## 🎯 Expected Result

### After Running Commands:

1. ✅ No module resolution errors
2. ✅ App builds successfully
3. ✅ Google Sign-In imports work
4. ✅ Can tap "Continue with Google"
5. ✅ Google account picker appears

---

## 🔍 Verification Checklist

### Check 1: Package Installed
```powershell
npm list @react-native-google-signin/google-signin
```
**Expected:** Shows version (no errors)

---

### Check 2: Module in package.json
```powershell
Select-String -Path package.json -Pattern "google-signin"
```
**Expected:** Shows line with `@react-native-google-signin/google-signin`

---

### Check 3: Native Module Linked
```powershell
Select-String -Path android\settings.gradle -Pattern "google-signin"
```
**Expected:** Shows autolinking entry

---

### Check 4: Import Works
Open `src/screens/AuthScreen.js` - should have no red underlines on:
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
```

---

### Check 5: App Builds
```powershell
npx expo run:android
```
**Expected:** Build succeeds, app launches

---

### Check 6: Google Sign-In Works
In the app:
1. Tap "Continue with Google"
2. Google picker appears
3. Can sign in

---

## 🐛 Troubleshooting

### Error: "Still cannot resolve module"

**Cause:** Metro bundler cache

**Fix:**
```powershell
# Clear Metro cache
npx expo start --clear

# Or restart Metro
npx react-native start --reset-cache
```

---

### Error: "Build failed with gradle error"

**Cause:** Cached gradle builds

**Fix:**
```powershell
# Clean gradle cache
cd android
.\gradlew clean
cd ..

# Rebuild
npx expo prebuild --clean
npx expo run:android
```

---

### Error: "GoogleSignin is not defined"

**Cause:** Module not imported or installed

**Fix:**
1. Verify import in `AuthScreen.js`:
   ```javascript
   import { GoogleSignin } from '@react-native-google-signin/google-signin';
   ```

2. Verify installation:
   ```powershell
   npm list @react-native-google-signin/google-signin
   ```

3. If not installed, run:
   ```powershell
   npx expo install @react-native-google-signin/google-signin
   ```

---

### Error: "DEVELOPER_ERROR" or "Error 10"

**Cause:** OAuth not configured (separate issue)

**Fix:** This is a different issue. See [FIX_GOOGLE_SIGNIN_OAUTH.md](FIX_GOOGLE_SIGNIN_OAUTH.md)

---

## 📊 Why `npx expo install` vs `npm install`?

### `npm install` (DON'T USE)
```powershell
npm install @react-native-google-signin/google-signin
```
- ❌ Installs latest npm version
- ❌ May conflict with Expo version
- ❌ Manual autolinking configuration
- ❌ May cause bundling errors

### `npx expo install` (USE THIS)
```powershell
npx expo install @react-native-google-signin/google-signin
```
- ✅ Installs Expo-compatible version
- ✅ Automatic version resolution
- ✅ Automatic autolinking setup
- ✅ Guaranteed to work with Expo Dev Client

---

## 🎯 Complete Fix Commands (Copy-Paste)

```powershell
# Navigate to project
cd c:\Users\afeson\Downloads\AfriList_Full_MVP_NO_AdminApproval

# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npx expo install
npx expo install @react-native-google-signin/google-signin

# Verify
npm list @react-native-google-signin/google-signin

# Rebuild
npx expo prebuild --clean
npx expo run:android
```

**Total time:** 3-7 minutes

---

## ✅ Success Indicators

After running fix:

- [x] No "cannot resolve module" errors
- [x] Package appears in `npm list`
- [x] Import has no TypeScript/IDE errors
- [x] App builds without errors
- [x] Google Sign-In button works
- [x] Google account picker appears

---

## 🔄 Alternative: If Commands Fail

### If PowerShell commands don't work:

**Use Git Bash or WSL:**
```bash
# Navigate to project
cd /c/Users/afeson/Downloads/AfriList_Full_MVP_NO_AdminApproval

# Clean install
rm -rf node_modules package-lock.json
npx expo install
npx expo install @react-native-google-signin/google-signin

# Rebuild
npx expo prebuild --clean
npx expo run:android
```

---

## 📚 Related Documentation

- [READY_TO_BUILD.md](READY_TO_BUILD.md) - After module is fixed
- [FIX_GOOGLE_SIGNIN_OAUTH.md](FIX_GOOGLE_SIGNIN_OAUTH.md) - OAuth configuration
- [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) - Complete setup guide

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Clean installation | 1-2 min |
| Install dependencies | 1-2 min |
| Prebuild | 1-2 min |
| Build & run | 2-3 min |
| **Total** | **5-9 min** |

---

## 🎉 After Fix

Once module is installed correctly:

1. ✅ Android bundling works
2. ✅ No module resolution errors
3. ✅ Google Sign-In imports correctly
4. ✅ App builds successfully
5. ✅ Ready to test Google Sign-In

**Then proceed to:** [READY_TO_BUILD.md](READY_TO_BUILD.md) for testing Google Sign-In functionality.

---

**Fix Module Resolution → Rebuild → Test Google Sign-In!** 🚀
