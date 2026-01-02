# ⚠️ RESTART REQUIRED - Bottom Sheet Implementation

## Critical: Babel Config Changed

The `babel.config.js` file was updated to include the `react-native-reanimated/plugin` which is **required** for @gorhom/bottom-sheet to work.

**You MUST restart the development server with cache clearing.**

## 🔴 MANDATORY STEPS:

### 1. Stop the Current Server
Press `Ctrl+C` in your terminal to stop the running development server.

### 2. Clear All Caches
```bash
# Clear npm cache
npx expo start --clear

# OR manually clear:
rm -rf node_modules/.cache
rm -rf .expo
```

### 3. Verify Installation
```bash
# Check @gorhom/bottom-sheet is installed
npm list @gorhom/bottom-sheet

# Should show: @gorhom/bottom-sheet@4.6.4 or similar
```

### 4. Start Fresh
```bash
npx expo start --clear
```

## 🧪 Test the Bottom Sheet

Once restarted:

1. **Open the app** in Expo Go or Dev Client
2. **Tap the globe icon** (language selector) in the header
3. **Expected behavior:**
   - Bottom sheet slides up from bottom
   - Opens to 80% of screen height
   - Header shows "Select Language"
   - **Language list is visible and scrollable**
   - Bottom tab bar remains visible
   - Can drag between 50% and 80%
   - Can swipe down to close
   - Can tap backdrop to close

## ❌ If Bottom Sheet Still Doesn't Appear:

### Check Console for Errors
Look for these errors:
- `"Reanimated 2 failed to create a worklet"` → babel config not loaded
- `"BottomSheet is not defined"` → import issue
- `"GestureHandlerRootView not found"` → missing wrapper

### Verify Files Were Updated:

**1. Check babel.config.js:**
```bash
cat babel.config.js
```
Should contain:
```javascript
plugins: ['react-native-reanimated/plugin']
```

**2. Check App.js:**
```bash
head -15 App.js
```
Should contain:
```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';
...
<GestureHandlerRootView style={{ flex: 1 }}>
```

**3. Check BottomSheetModal.js exists:**
```bash
ls -la src/components/BottomSheetModal.js
```

### Force Rebuild (Last Resort)

If clearing cache doesn't work:

```bash
# 1. Stop server
# 2. Remove all caches
rm -rf node_modules
rm -rf .expo
rm -rf node_modules/.cache

# 3. Reinstall
npm install

# 4. Start fresh
npx expo start --clear
```

## 🎯 Expected Final Behavior

**Before Fix:**
- ❌ Bottom sheet covers tab bar
- ❌ Language list not visible
- ❌ Can't scroll
- ❌ No gestures

**After Fix (when properly restarted):**
- ✅ Bottom sheet at 50% or 80%
- ✅ Language list fully visible
- ✅ Scrolling works smoothly
- ✅ Tab bar always visible
- ✅ Drag between snap points
- ✅ Swipe down to close
- ✅ Tap backdrop to close

## 📱 Device-Specific Notes

### Expo Go
- Should work immediately after restart
- Make sure using latest Expo Go version

### Expo Dev Client
- May need to rebuild: `eas build --platform android --profile development`
- Install new APK on device
- Then test

### Production Build
- Requires full rebuild: `eas build --platform android --profile production`
- All features will work as expected

## 🔧 Debugging

If it still doesn't work after restart, share:
1. Console output (errors)
2. Screenshot of what you see
3. Which device/simulator you're testing on
4. Output of: `npm list @gorhom/bottom-sheet`

---

**Remember: Cache clearing is CRITICAL for babel config changes!**
