# ⚡ Get Your Firebase Config (2 Minutes)

## The app NOW REQUIRES real Firebase config - demo mode is disabled.

---

## Step 1: Go to Firebase Console

Open: https://console.firebase.google.com/

---

## Step 2: Select or Create Project

- **If you already have a project:** Click on it
- **If you need to create one:** Click "Add project" and follow the wizard

---

## Step 3: Get Your Config

1. Click the **⚙️ gear icon** (Project Settings) in the left sidebar
2. Scroll down to **"Your apps"** section
3. **If you see a web app** (`</>` icon):
   - Click on it to expand
   - Find the `firebaseConfig` object
   - **Copy all the values**

4. **If you DON'T see a web app:**
   - Click the **`</>`** button (Add app → Web)
   - Give it a nickname: "AfriList Web"
   - Click "Register app"
   - **Copy the firebaseConfig values** that appear

---

## Step 4: Example Config

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "my-project-12345.firebaseapp.com",
  projectId: "my-project-12345",
  storageBucket: "my-project-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};
```

---

## Step 5: Update Your .env File

1. Open `.env` in your project root
2. Replace the demo values with YOUR values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=my-project-12345.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=my-project-12345
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=my-project-12345.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
```

3. **Save the file**

---

## Step 6: Enable Phone Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click "Get started" (if first time)
3. Click **"Sign-in method"** tab
4. Find **"Phone"** in the list
5. Click on it
6. Toggle **"Enable"** to ON
7. Click **"Save"**

---

## Step 7: Add Authorized Domains

1. Still in **Authentication**, go to **Settings** tab
2. Scroll to **"Authorized domains"**
3. Make sure these are listed:
   - `localhost` ✅
   - Your production domain (if deploying)

If `localhost` is not there:
- Click "Add domain"
- Enter: `localhost`
- Click "Add"

---

## Step 8: Restart Your App

**CRITICAL:** You MUST restart with cache clear:

```bash
# Stop the current server (Ctrl+C)

# Then run:
npx expo start --clear
```

Press `w` to open in web browser.

---

## Step 9: Verify It Works

1. Open the app in your browser
2. Check the browser console (F12 → Console tab)
3. You should see:
   ```
   🔥 Firebase Config Loaded: { apiKey: 'AIzaSyB...', ... }
   🔥 Initializing Firebase for the first time...
   ✅ Firebase initialized successfully!
   ✅ Firebase services ready: { auth: '✓', db: '✓', storage: '✓' }
   🔐 Initializing reCAPTCHA...
   ✅ reCAPTCHA initialized successfully
   ```

4. **No errors** = You're ready!

---

## Step 10: Test with Real Phone

1. Enter your phone number: `+1234567890` (US) or `+[country][number]`
2. Click **"Send Verification Code"**
3. Check your phone for SMS (arrives in 5-30 seconds)
4. Enter the 6-digit code
5. Click **"Verify Code"**
6. **Success!** 🎉

---

## ⚠️ Troubleshooting

### Error: "Firebase configuration is incomplete"
- **Cause:** .env file still has demo/placeholder values
- **Fix:** Update .env with REAL values from Firebase Console, then restart

### Error: "Firebase configuration contains demo/invalid values"
- **Cause:** apiKey is too short or contains "demo"/"replace"
- **Fix:** Copy the REAL apiKey from Firebase Console (should be 39+ characters)

### Error: "Operation not allowed"
- **Cause:** Phone authentication not enabled in Firebase
- **Fix:** Go to Authentication → Sign-in method → Enable "Phone"

### Error: "auth/unauthorized-domain"
- **Cause:** Your domain is not authorized in Firebase
- **Fix:** Add `localhost` to authorized domains (see Step 7)

### App still shows old demo mode
- **Cause:** Cache not cleared
- **Fix:** Stop server, run `npx expo start --clear`, press `w`

### reCAPTCHA not loading
- **Cause:** Browser blocking third-party content or cookies
- **Fix:** 
  - Allow third-party cookies for localhost
  - Try incognito/private browsing mode
  - Check browser console for errors

---

## Quick Reference

| What | Where |
|------|-------|
| Firebase Console | https://console.firebase.google.com/ |
| Project Settings | Click ⚙️ gear icon |
| Get Config | Project Settings → Your apps → Web app |
| Enable Phone Auth | Authentication → Sign-in method → Phone |
| Authorized Domains | Authentication → Settings → Authorized domains |
| Update .env | Open `.env` file in project root |
| Restart App | `npx expo start --clear` |

---

## That's It!

Once you complete these steps:
- ✅ No more "Firebase default app initialization error"
- ✅ No demo mode
- ✅ Real SMS sent to your phone
- ✅ Production-ready authentication

**Need help?** See `FIREBASE_PHONE_AUTH_SETUP.md` for detailed troubleshooting.




