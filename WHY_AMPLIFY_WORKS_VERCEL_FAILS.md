# 🔍 Why Create Listing Works on AWS Amplify but Fails on Vercel

**TL;DR:** Vercel is likely missing Firebase environment variables that Amplify has configured.

---

## 🎯 Root Cause Analysis

### The Problem
- **AWS Amplify:** Create Listing works perfectly ✅
- **Vercel Expo Web:** Create Listing fails with timeout/Firebase errors ❌

### The Difference
Both platforms build the **exact same source code**, but they have **different environment variable configurations**.

---

## 🔧 How Environment Variables Work

### Local Development (.env file)
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=sabalist.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=sabalist
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=sabalist.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=231273918004
EXPO_PUBLIC_FIREBASE_APP_ID=1:231273918004:web:0020dcc14b7f52e3356461
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LGGRMQBGSD
```

### How Expo Web Injects Variables
**File:** `webpack.config.js` (lines 59-69)

```javascript
config.plugins.push(
  new webpack.DefinePlugin({
    'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    'process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    'process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    'process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    'process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    'process.env.EXPO_PUBLIC_FIREBASE_APP_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
    'process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID),
  })
);
```

**What this does:**
1. Webpack reads environment variables from the **build machine**
2. It replaces `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` with the actual value
3. These values are **hardcoded into the JavaScript bundle** during build

### Where Firebase Uses These Variables
**File:** `src/lib/firebase.web.js` (lines 7-15)

```javascript
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

---

## 🏗️ Build Process Comparison

### AWS Amplify Build Process

**Config:** `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 20
        - npm ci --legacy-peer-deps
    build:
      commands:
        - npm run build  # ← Runs: expo export:web
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

**What happens:**
1. Amplify Console provides environment variables via **Environment Variables Settings**
2. `npm run build` executes
3. Webpack reads `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` etc. from Amplify environment
4. Firebase credentials are **baked into the bundle**
5. Build succeeds with Firebase configured ✅

### Vercel Build Process

**Config:** `vercel.json`

```json
{
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist"
}
```

**What happens:**
1. Vercel runs `npm run vercel-build`
2. Webpack tries to read `process.env.EXPO_PUBLIC_FIREBASE_*`
3. **If Vercel doesn't have these environment variables configured:**
   - `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` = `undefined`
   - Webpack injects `undefined` into the bundle
4. Firebase config becomes:
   ```javascript
   const firebaseConfig = {
     apiKey: undefined,
     authDomain: undefined,
     projectId: undefined,
     // ... all undefined
   };
   ```
5. Firebase initialization **fails or uses invalid config** ❌

---

## 🐛 Symptom: How Undefined Config Manifests

### Console Output with Missing Environment Variables

```javascript
console.log('🔥 Firebase Web SDK initialized:', {
  hasAuth: !!app,
  hasConfig: !!firebaseConfig.apiKey,  // ← FALSE if undefined
  projectId: firebaseConfig.projectId,  // ← undefined
});
```

**Expected (Amplify):**
```
🔥 Firebase Web SDK initialized: {
  hasAuth: true,
  hasConfig: true,
  projectId: 'sabalist'
}
```

**Actual (Vercel without env vars):**
```
🔥 Firebase Web SDK initialized: {
  hasAuth: false,
  hasConfig: false,
  projectId: undefined
}
```

### Firebase Errors You Might See

1. **Invalid API Key:**
   ```
   FirebaseError: Firebase: Error (auth/invalid-api-key)
   ```

2. **Invalid Project ID:**
   ```
   FirebaseError: Firebase: Error (app/invalid-project-id)
   ```

3. **Storage Upload Fails:**
   ```
   FirebaseError: Firebase Storage: Object 'listings/...' does not exist
   ```

4. **Firestore Write Times Out:**
   ```
   Error: Request timeout. Please check your internet connection and try again.
   ```

---

## ✅ Solution: Configure Vercel Environment Variables

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Select your project: **afrilist-mvp**
3. Go to **Settings → Environment Variables**

### Step 2: Add Firebase Environment Variables

Add these **7 variables** (copy exact values from `.env`):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `sabalist.firebaseapp.com` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `sabalist` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `sabalist.firebasestorage.app` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `231273918004` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:231273918004:web:0020dcc14b7f52e3356461` | Production, Preview, Development |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-LGGRMQBGSD` | Production, Preview, Development |

**Important:**
- Check **all three environment types** (Production, Preview, Development)
- These are **public client-side credentials** (safe to expose in bundle)
- Firebase security is enforced by **Firestore Security Rules**, not by hiding credentials

### Step 3: Redeploy
After adding environment variables:

```bash
git commit --allow-empty -m "Trigger Vercel rebuild with Firebase env vars"
git push origin master
```

Or manually trigger a redeploy in Vercel dashboard:
1. Go to **Deployments** tab
2. Click **⋮** on latest deployment
3. Click **Redeploy**

---

## 🔍 How to Verify Environment Variables Are Working

### Option 1: Check Vercel Build Logs
1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment
3. Click **Building** tab
4. Look for webpack output:
   ```
   DefinePlugin {
     'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': '"AIzaSyBTy..."'
   }
   ```

### Option 2: Check Bundle Output
After deployment, visit https://sabalist.com and:

1. Open browser DevTools (F12)
2. Go to **Sources** tab
3. Search for `EXPO_PUBLIC_FIREBASE_API_KEY`
4. You should see the actual API key value (not `undefined`)

### Option 3: Check Console Logs
Visit https://sabalist.com:
1. Open browser console (F12)
2. Look for:
   ```
   🔥 Firebase Web SDK initialized: {
     hasAuth: true,
     hasConfig: true,  // ← Should be TRUE
     projectId: 'sabalist'  // ← Should have value
   }
   ```

---

## 📊 Why Amplify Works (Already Has Env Vars)

AWS Amplify likely has environment variables configured in:
- **Amplify Console → App Settings → Environment Variables**
- Or you previously configured them during Amplify setup

**To check Amplify environment variables:**
1. Go to AWS Amplify Console
2. Select your app
3. Click **Environment variables** in left sidebar
4. Verify all 7 Firebase variables are present

---

## 🔒 Security Note: Are These Credentials Safe to Expose?

**YES, it's safe.** Here's why:

### Client-Side Credentials (Public)
Firebase credentials in `firebaseConfig` are **meant to be public**:
- They're embedded in every mobile app (iOS/Android)
- They're visible in browser DevTools
- Google Firebase documentation explicitly states these are **public identifiers**

### Security Is Enforced By Firestore Rules
**File:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;  // ← User must be authenticated
    }

    function isValidCategory(category) {
      return category == 'Electronics'
          || category == 'Vehicles'
          || category == 'Real Estate'
          || category == 'Fashion'
          || category == 'Services';
    }

    match /listings/{listingId} {
      // Anyone can read active listings
      allow read: if true;

      // Only authenticated users can create listings
      allow create: if isSignedIn()
                    && isValidCategory(request.resource.data.category)
                    && request.resource.data.userId == request.auth.uid;

      // Only owner can update/delete
      allow update, delete: if isSignedIn()
                             && resource.data.userId == request.auth.uid;
    }
  }
}
```

**Security layers:**
1. ✅ Authentication required for writes (`isSignedIn()`)
2. ✅ Category validation (`isValidCategory()`)
3. ✅ User ownership check (`userId == request.auth.uid`)
4. ✅ Public reads allowed (marketplace needs this)

---

## 🎯 Summary

### Why Amplify Works
```
AWS Amplify Environment Variables → Webpack Build → Firebase Config ✅
```

### Why Vercel Fails
```
Missing Vercel Environment Variables → Webpack Build → Firebase Config = undefined ❌
```

### The Fix
```
Add Firebase env vars to Vercel → Trigger Redeploy → Firebase Config ✅
```

---

## 📋 Action Items

### Immediate Fix (5 minutes):
1. ✅ Go to Vercel Dashboard → Settings → Environment Variables
2. ✅ Add all 7 Firebase environment variables
3. ✅ Select Production, Preview, and Development environments
4. ✅ Save and redeploy

### Verification (2 minutes):
1. ✅ Visit https://sabalist.com
2. ✅ Open console (F12)
3. ✅ Verify Firebase initialized with valid config
4. ✅ Test Create Listing flow

### Long-term:
- Consider using Vercel CLI to manage environment variables:
  ```bash
  vercel env add EXPO_PUBLIC_FIREBASE_API_KEY production
  ```

---

## 🔗 References

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Firebase Web SDK Configuration](https://firebase.google.com/docs/web/setup)
- [Webpack DefinePlugin](https://webpack.js.org/plugins/define-plugin/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)

---

**Expected Result:** After adding environment variables to Vercel, Create Listing should work exactly like it does on Amplify.
