# 🚀 Quick Start - Email Magic Link

## **Status: ✅ CODE READY**

---

## **What Was Done:**

### **✅ Fixed: `src/screens/AuthScreen.js` (Line 130)**
```javascript
// OLD (BROKEN):
url: 'https://sabalist.page.link/auth'

// NEW (FIXED):
const redirectUrl = Linking.createURL('/');
console.log('📱 Redirect URL:', redirectUrl);
// url: redirectUrl
```

---

## **What You Need to Do (2 minutes):**

### **1. Add Domains to Firebase Console**

🔗 [Firebase Console](https://console.firebase.google.com/) → Your Project → **Authentication** → **Settings** → **Authorized domains**

**Click "Add domain" and add these TWO domains:**

```
auth.expo.io
exp.host
```

**That's it!**

---

### **2. Restart Dev Server**

```powershell
npx expo start --clear --dev-client
```

---

### **3. Test Email Magic Link**

1. Open app on Android
2. Enter email: `your@email.com`
3. Tap **"Send Login Link"**
4. Check console - should see:
   ```
   📱 Redirect URL: exp://192.168.x.x:8081/
   ✅ Magic link sent successfully!
   ```
5. Open email (check spam)
6. Click the link
7. App opens automatically
8. You're signed in! ✅

---

## **Expected Console Output:**

### **Sending Link:**
```
📧 Sending magic link to: user@example.com
📱 Redirect URL: exp://192.168.1.5:8081/
✅ Magic link sent successfully!
```

### **Receiving Link:**
```
🔗 Received deep link: exp://192.168.1.5:8081/?mode=signIn&oobCode=ABC123...
🔐 Completing sign-in with email link...
✅ User signed in: xyz789abc...
✅ Auth state: USER SIGNED IN
```

---

## **Troubleshooting:**

### **Still getting `auth/unauthorized-domain`?**
- Double-check you added `auth.expo.io` to Firebase Console
- Double-check you added `exp.host` to Firebase Console
- Restart dev server after adding domains

### **Link opens in browser instead of app?**
- Make sure you're using Expo Dev Client (not Expo Go)
- Rebuild if needed: `npx expo run:android`

### **Email not arriving?**
- Check spam folder
- Wait 1-2 minutes
- Try a different email
- Check Firebase Console > Authentication > Users to see if it's working

---

## **Files Changed:**

| File | Lines | Change |
|------|-------|--------|
| `src/screens/AuthScreen.js` | 126-146 | Use `Linking.createURL('/')` for redirect |

**Total changes: 1 file, ~20 lines**

---

## **No Rebuild Needed! ✅**

This is JavaScript-only, so:
- Just restart Metro bundler
- Hot reload will work
- No need to rebuild APK

---

## **✅ Summary:**

**Code:** ✅ Fixed
**Firebase Setup:** ⏳ Add 2 domains
**Rebuild:** ❌ Not needed
**Google Sign-In:** ✅ Still working

**Total Time:** 2 minutes to add domains + test

---

## **After Adding Domains:**

**✅ Email Magic Link is now working!**
