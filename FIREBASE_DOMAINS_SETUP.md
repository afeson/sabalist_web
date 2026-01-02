# 🔥 Firebase Authorized Domains Setup for Email Magic Link

## **Issue:**
Email Magic Link fails with `auth/unauthorized-domain` error.

## **Solution:**
Add the correct Expo deep link domains to Firebase Console.

---

## **Step 1: Add Domains to Firebase Console**

### **Firebase Console > Authentication > Settings > Authorized domains**

Add ALL of these domains:

### **Required Domains:**

1. **Expo Auth Domain (CRITICAL)**
   ```
   auth.expo.io
   ```
   ✅ This is the primary domain Expo uses for deep linking in dev client

2. **Your Expo Domain (If Published)**
   ```
   exp.host
   ```
   ✅ Used when running published Expo apps

3. **Local Development**
   ```
   localhost
   127.0.0.1
   10.0.2.2
   ```
   ✅ For Android emulator and local testing

4. **Expo Development**
   ```
   expo.dev
   ```
   ✅ For Expo Go and dev client

5. **Your Custom Domain (If Applicable)**
   ```
   sabalist.page.link
   ```
   ✅ If using Firebase Dynamic Links (not required for Expo Dev Client)

---

## **Step 2: How to Add Domains**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Authentication** in left sidebar
4. Click **Settings** tab
5. Scroll to **Authorized domains**
6. Click **Add domain**
7. Enter each domain from the list above
8. Click **Add**

**Screenshot locations:**
```
Firebase Console
└── Authentication
    └── Settings
        └── Authorized domains
            └── Add domain
```

---

## **Step 3: Verify Domains Are Added**

After adding, your **Authorized domains** list should include:

```
✅ localhost
✅ 127.0.0.1
✅ 10.0.2.2
✅ expo.dev
✅ auth.expo.io          ← CRITICAL
✅ exp.host              ← CRITICAL
✅ sabalist.page.link    ← Optional (for Dynamic Links)
```

---

## **What the Code Does Now:**

### **Before (BROKEN):**
```javascript
const actionCodeSettings = {
  url: 'https://sabalist.page.link/auth',  // ❌ Not recognized by Expo
  dynamicLinkDomain: 'sabalist.page.link',
  // ...
};
```

### **After (FIXED):**
```javascript
const redirectUrl = Linking.createURL('/');
console.log('📱 Redirect URL:', redirectUrl);
// Outputs: exp://192.168.1.5:8081/ or https://auth.expo.io/@afrson/sabalist/

const actionCodeSettings = {
  url: redirectUrl,  // ✅ Expo deep link that Firebase recognizes
  handleCodeInApp: true,
  android: {
    packageName: 'com.sabalist.app',
    installApp: true,
    minimumVersion: '1',
  },
};
```

---

## **Expected Redirect URLs:**

### **Development (Expo Dev Client):**
```
exp://192.168.x.x:8081/
exp://localhost:8081/
exp://10.0.2.2:8081/
```

### **Published (EAS or Expo):**
```
exp://exp.host/@afrson/sabalist/
https://auth.expo.io/@afrson/sabalist/
```

### **Custom Scheme:**
```
sabalist://
```

All of these will work if the domains are properly configured in Firebase.

---

## **Testing the Fix:**

### **1. Check Console Logs:**
When you send a magic link, you should see:
```
📧 Sending magic link to: user@example.com
📱 Redirect URL: exp://192.168.1.5:8081/
✅ Magic link sent successfully!
```

### **2. Check Email:**
The email from Firebase should contain a link like:
```
https://sabalist-app.firebaseapp.com/__/auth/action?
  mode=signIn
  &oobCode=ABC123...
  &continueUrl=exp://192.168.1.5:8081/
  &lang=en
```

### **3. Click the Link:**
- On Android emulator: Should open the Sabalist app
- In browser: Will redirect to exp:// URL
- Should trigger deep link handler in app

### **4. Expected Console Output:**
```
🔗 Received deep link: exp://192.168.1.5:8081/?mode=signIn&oobCode=ABC123...
🔐 Completing sign-in with email link...
✅ User signed in: xyz789...
✅ Auth state: USER SIGNED IN
```

---

## **Troubleshooting:**

### **Error: "auth/unauthorized-domain"**
**Cause:** Domain not added to Firebase Console
**Fix:** Add `auth.expo.io` and `exp.host` to Authorized domains

### **Error: "auth/invalid-action-code"**
**Cause:** Link expired or already used
**Fix:** Request a new magic link

### **Error: Link opens in browser but doesn't open app**
**Cause:** Deep linking not configured
**Fix:**
1. Rebuild app with `npx expo prebuild --clean`
2. Verify `scheme: "sabalist"` in app.json
3. Test with `npx uri-scheme open sabalist:// --android`

### **App doesn't receive the deep link**
**Cause:** Deep link listener not set up
**Fix:** Already implemented in AuthScreen.js lines 94-107:
```javascript
const subscription = Linking.addEventListener('url', ({ url }) => {
  handleDynamicLink(url);
});
```

---

## **Production Deployment:**

When you deploy to production:

1. **EAS Build:**
   ```bash
   eas build --platform android --profile production
   ```
   The deep link will automatically use your EAS domain

2. **Add Production Domain:**
   If using custom domain, add to Firebase:
   ```
   yourdomain.com
   www.yourdomain.com
   ```

3. **Firebase Dynamic Links (Optional):**
   If you want branded short links:
   - Create a Dynamic Link in Firebase Console
   - Point it to your Expo deep link
   - Add the domain to Authorized domains

---

## **Summary:**

✅ **Code Updated:** AuthScreen.js now uses `Linking.createURL('/')` for Expo-compatible deep links

✅ **What You Need to Do:**
1. Go to Firebase Console > Authentication > Settings
2. Add `auth.expo.io` to Authorized domains
3. Add `exp.host` to Authorized domains
4. Restart your Expo dev server: `npx expo start --clear`
5. Test email magic link

✅ **No Code Changes Needed:** The fix is already applied

✅ **No Rebuild Needed:** JavaScript-only change, hot reload will work

---

**After adding the domains, Email Magic Link will work! 🎉**
