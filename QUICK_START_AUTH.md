# 🚀 Quick Start - Email Magic Link Auth

## 5-Minute Setup Guide

### 1️⃣ Firebase Console (2 minutes)

```
1. Go to: console.firebase.google.com
2. Select: Your Sabalist project
3. Navigate: Authentication → Sign-in method
4. Click: Email/Password
5. Enable: ✅ Email link (passwordless sign-in)
6. Click: Save

7. Navigate: Dynamic Links (under Engage)
8. Click: Get Started
9. Accept: sabalist.page.link
10. Click: Finish

11. Navigate: Authentication → Settings → Authorized domains
12. Add: sabalist.page.link
13. Click: Add domain
```

**Done! ✅** Firebase is configured.

---

### 2️⃣ Test the App (3 minutes)

```bash
# Clean rebuild
npx expo prebuild --clean

# Run on Android
npm run android
```

**Test flow:**
1. Open app → See login screen
2. Enter your email → Click "Send Login Link"
3. Check email inbox → Click the link
4. App opens → You're signed in!

---

## 🎨 What Changed

### User Flow

**Before (Phone OTP):**
```
Enter phone → Wait for SMS → Type 6-digit code → Sign in
⏱️ ~60 seconds
💰 ~$0.05 per login
```

**After (Email Magic Link):**
```
Enter email → Click link in email → Sign in
⏱️ ~30 seconds
💰 $0 (FREE)
```

---

## 📁 Files Modified

1. **[src/screens/AuthScreen.js](src/screens/AuthScreen.js)** - NEW ✨
   - Email magic link UI + logic

2. **[App.js](App.js)** - Line 5, 50
   - `PhoneOTPScreen` → `AuthScreen`

3. **[app.json](app.json)** - Lines 10, 24, 34-47
   - Added deep link config

---

## 🐛 Troubleshooting

### Email not received?
- ✅ Check spam folder
- ✅ Wait 1-2 minutes
- ✅ Try a different email

### Link doesn't open app?
```bash
# Rebuild app
npx expo prebuild --clean
npm run android
```

### "unauthorized-continue-uri" error?
- ✅ Add `sabalist.page.link` to Firebase Authorized domains

---

## 📚 Full Documentation

- **Setup Guide:** [FIREBASE_EMAIL_AUTH_SETUP.md](FIREBASE_EMAIL_AUTH_SETUP.md)
- **Migration Info:** [AUTH_MIGRATION_COMPLETE.md](AUTH_MIGRATION_COMPLETE.md)
- **Code:** [src/screens/AuthScreen.js](src/screens/AuthScreen.js)

---

## ✅ Benefits

| Feature | Phone OTP | Email Link |
|---------|-----------|------------|
| **Cost** | $0.03-0.05/user | **FREE** |
| **iOS** | Needs APNs | **Works** |
| **Friction** | Type 6 digits | **Click link** |
| **Security** | SIM swap risk | **More secure** |
| **Africa** | SMS expensive | **Email free** |

---

## 🎯 Next Steps

1. ✅ Complete 5-minute Firebase setup above
2. ✅ Test email flow
3. ⏳ Deploy to production
4. ⏳ (Optional) Add Google Sign-In

**That's it!** 🚀

Your app now has FREE, passwordless authentication.
