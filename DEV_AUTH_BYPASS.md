# 🔓 DEV-ONLY AUTH BYPASS

## ✅ IMPLEMENTED

A development-only authentication bypass has been added to skip the email magic link flow when running in development mode.

---

## 🎯 WHAT IT DOES

### Development Mode (`__DEV__ === true`)
- ✅ App opens directly to MainTabNavigator (home screen)
- ✅ No email/magic link required
- ✅ No Firebase authentication
- ✅ Fake dev user is automatically "authenticated"
- ✅ Instant login on app start

### Production Mode (`__DEV__ === false`)
- ✅ Normal Firebase email magic link flow
- ✅ Full authentication required
- ✅ No bypass - secure authentication enforced

---

## 📝 FAKE DEV USER

When in development mode, the app uses this fake user:

```javascript
{
  uid: 'dev-user-12345',
  email: 'dev@sabalist.app',
  displayName: 'Dev User',
  emailVerified: true,
  phoneNumber: null,
  photoURL: null,
}
```

This user object is available throughout your app via `useAuth()`.

---

## 🔧 HOW IT WORKS

### File Modified: `src/contexts/AuthContext.js`

#### 1. Dev User Constant (Lines 39-48)

```javascript
const DEV_USER = {
  uid: 'dev-user-12345',
  email: 'dev@sabalist.app',
  displayName: 'Dev User',
  emailVerified: true,
  phoneNumber: null,
  photoURL: null,
};
```

#### 2. Auth Setup with Dev Bypass (Lines 64-79)

```javascript
// DEV-ONLY: Bypass authentication in development
if (__DEV__) {
  console.log('🚀 DEV MODE: Bypassing authentication with fake user');
  console.log('   Fake user:', DEV_USER.email);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (mounted) {
    setUser(DEV_USER);
    setLoading(false);
  }

  console.log('✅ DEV MODE: Fake user authenticated');
  return; // Skip Firebase setup in dev mode
}

// PRODUCTION: Normal Firebase auth flow
console.log('🔒 PRODUCTION MODE: Using Firebase authentication');
// ... Firebase setup continues ...
```

#### 3. Logout with Dev Mode Support (Lines 146-152)

```javascript
// DEV-ONLY: Handle logout in dev mode
if (__DEV__) {
  console.log('🚀 DEV MODE: Simulating logout');
  setUser(null);
  console.log('✅ DEV MODE: User logged out');
  return true;
}

// PRODUCTION: Normal Firebase logout
// ... Firebase logout continues ...
```

---

## 🚀 USAGE

### Start Development

```bash
# Start Expo dev server
npx expo start

# Or start with specific platform
npx expo start --android
npx expo start --ios
```

**Expected behavior:**
1. App shows loading screen briefly (~500ms)
2. Console shows: `🚀 DEV MODE: Bypassing authentication with fake user`
3. Console shows: `✅ DEV MODE: Fake user authenticated`
4. App opens directly to home screen (MainTabNavigator)
5. No email/magic link screen

### Test Logout in Dev Mode

```javascript
// In your app, call logout:
const { logout } = useAuth();
await logout();
```

**Expected behavior:**
1. Console shows: `🚀 DEV MODE: Simulating logout`
2. Console shows: `✅ DEV MODE: User logged out`
3. App returns to AuthScreen
4. You can immediately see the bypass again on reload

---

## 🔍 CONSOLE LOGS

### Development Mode Logs:

```
AUTH_CONTEXT: Setting up auth listener
AUTH_CONTEXT: Platform = android
🚀 DEV MODE: Bypassing authentication with fake user
   Fake user: dev@sabalist.app
✅ DEV MODE: Fake user authenticated
APP_RENDER: Rendering with user = AUTHENTICATED
```

### Production Mode Logs:

```
AUTH_CONTEXT: Setting up auth listener
AUTH_CONTEXT: Platform = android
🔒 PRODUCTION MODE: Using Firebase authentication
🔥 AUTH_CONTEXT: Loading Firebase modules...
✅ AUTH_CONTEXT: Firebase modules loaded
AUTH_CONTEXT: Native auth state changed
AUTH_CONTEXT: User = NULL
```

---

## 🧪 TESTING

### Test 1: Verify Dev Bypass Works

```bash
# Start in dev mode
npx expo start --dev-client

# Watch console for:
# "🚀 DEV MODE: Bypassing authentication"
# App should open to home screen
```

### Test 2: Verify Production Mode Still Works

To test production mode behavior (even in dev):

1. **Temporarily disable dev mode** in AuthContext.js:

```javascript
// Change this line:
if (__DEV__) {

// To:
if (false && __DEV__) {
```

2. **Restart app** - should now use Firebase authentication
3. **Revert the change** when done testing

### Test 3: Access User Data

In any component:

```javascript
import { useAuth } from './src/contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();

  console.log('Current user:', user);
  // Development: { uid: 'dev-user-12345', email: 'dev@sabalist.app', ... }
  // Production: { uid: 'real-firebase-uid', email: 'user@example.com', ... }

  return <Text>Logged in as: {user?.email}</Text>;
}
```

---

## ⚠️ IMPORTANT NOTES

### 1. Production Safety

✅ **Safe for Production**
- The bypass ONLY runs when `__DEV__ === true`
- Production builds automatically set `__DEV__ = false`
- No manual changes needed before production build

### 2. Firebase Not Loaded in Dev

- Firebase modules are NOT loaded in dev mode
- If you need to test Firebase features, temporarily disable bypass
- Firestore, Storage, etc. will not work in dev mode with bypass active

### 3. Persistent Dev Login

- Dev user persists between app reloads
- To test login flow, you must:
  1. Call `logout()` to clear user
  2. Reload app to see bypass again

### 4. Different User ID in Firestore

If your app creates user documents in Firestore:

```javascript
// Dev mode: will use dev-user-12345
// Production: will use real Firebase UID

// Example: Creating a user doc
firestore()
  .collection('users')
  .doc(user.uid)  // 'dev-user-12345' in dev, real UID in prod
  .set({ ... });
```

Consider using a test Firestore project for development.

---

## 🎛️ CUSTOMIZATION

### Change Fake User Details

Edit the `DEV_USER` constant in `src/contexts/AuthContext.js`:

```javascript
const DEV_USER = {
  uid: 'your-custom-dev-id',
  email: 'custom@example.com',
  displayName: 'Custom Dev Name',
  emailVerified: true,
  phoneNumber: '+1234567890',  // Add phone if needed
  photoURL: 'https://...',      // Add photo if needed
};
```

### Adjust Simulated Delay

Change the timeout value (currently 500ms):

```javascript
// Simulate network delay
await new Promise(resolve => setTimeout(resolve, 500));  // Change 500 to your preference
```

### Disable Dev Bypass Temporarily

To test real authentication in dev mode:

```javascript
// In setupAuth function, change:
if (__DEV__) {

// To:
if (false) {  // Temporarily disable
```

---

## 🔄 ENABLE/DISABLE

### To Disable Dev Bypass (Permanently)

Remove or comment out the dev bypass code in `src/contexts/AuthContext.js`:

```javascript
// Comment out this entire block:
/*
if (__DEV__) {
  console.log('🚀 DEV MODE: Bypassing authentication with fake user');
  // ... rest of bypass code
  return;
}
*/
```

### To Re-enable

Uncomment the code or restore from git:

```bash
git checkout src/contexts/AuthContext.js
```

---

## 📊 BEFORE vs AFTER

### BEFORE (Development Flow)

```
1. App starts
2. Shows AuthScreen
3. Enter email
4. "Check your email"
5. Click magic link in email
6. Wait for redirect
7. App authenticates
8. Shows home screen
```

**Time:** ~30-60 seconds per test

### AFTER (Development Flow)

```
1. App starts
2. Shows loading (0.5s)
3. Shows home screen
```

**Time:** ~0.5 seconds per test

---

## ✅ FILES MODIFIED

1. **src/contexts/AuthContext.js**
   - Added `DEV_USER` constant (lines 39-48)
   - Added dev bypass in `setupAuth` (lines 64-79)
   - Added dev logout in `logout` (lines 146-152)

**Total lines changed:** ~30 lines

---

## 🚀 NEXT STEPS

1. **Test it now:**
   ```bash
   npx expo start
   ```

2. **Verify console logs** show dev bypass messages

3. **Enjoy instant login** during development

4. **When ready for production:**
   ```bash
   eas build --platform android --profile production
   # Dev bypass automatically disabled in production
   ```

---

Last Updated: 2026-01-01
