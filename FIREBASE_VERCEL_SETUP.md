# Firebase Configuration for Vercel Deployment (sabalist.com)

## 🔧 What You Need to Add in Firebase Console

Since your app is now deployed on **Vercel** at **sabalist.com**, you need to whitelist these domains in Firebase to allow authentication and prevent CORS errors.

## 📋 Step-by-Step Instructions

### 1. Add Authorized Domains for Firebase Authentication

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **sabalist**
3. Go to **Authentication** → **Settings** → **Authorized domains** tab
4. Click **Add domain** and add the following domains:

```
sabalist.com
www.sabalist.com
afrilist-p0k3ughwg-afesons-projects.vercel.app
```

**Important:** Add ALL Vercel preview URLs too:
```
afrilist-mvp.vercel.app
*.vercel.app (if available, or add each preview domain individually)
```

### 2. Update OAuth Redirect URIs (If using Google Sign-In)

If you're using Google Sign-In, you need to update the OAuth consent screen:

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select project: **sabalist**
3. Go to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** for web
5. Add to **Authorized JavaScript origins**:
   ```
   https://sabalist.com
   https://www.sabalist.com
   https://afrilist-p0k3ughwg-afesons-projects.vercel.app
   ```

6. Add to **Authorized redirect URIs**:
   ```
   https://sabalist.com/__/auth/handler
   https://www.sabalist.com/__/auth/handler
   https://afrilist-p0k3ughwg-afesons-projects.vercel.app/__/auth/handler
   ```

### 3. Firestore Security Rules

Verify your Firestore rules allow access from your web domain:

1. Go to **Firestore Database** → **Rules**
2. Make sure your rules are configured properly (current rules in `firestore.rules`)
3. If needed, update to allow authenticated users

### 4. Storage CORS Configuration

If you're using Firebase Storage for image uploads, configure CORS:

Create a file `cors.json`:
```json
[
  {
    "origin": ["https://sabalist.com", "https://www.sabalist.com", "https://*.vercel.app"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Apply it:
```bash
gsutil cors set cors.json gs://sabalist.firebasestorage.app
```

### 5. Add Domains to Vercel Environment Variables

Your Firebase config is already in `.env`, but make sure Vercel has access to these environment variables:

```bash
# Add environment variables to Vercel
vercel env add EXPO_PUBLIC_FIREBASE_API_KEY
# Paste: AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk

vercel env add EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
# Paste: sabalist.firebaseapp.com

vercel env add EXPO_PUBLIC_FIREBASE_PROJECT_ID
# Paste: sabalist

vercel env add EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
# Paste: sabalist.firebasestorage.app

vercel env add EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# Paste: 231273918004

vercel env add EXPO_PUBLIC_FIREBASE_APP_ID
# Paste: 1:231273918004:web:0020dcc14b7f52e3356461

vercel env add EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
# Paste: G-LGGRMQBGSD
```

**Or add them via Vercel Dashboard:**
1. Go to: https://vercel.com/afesons-projects/afrilist-mvp/settings/environment-variables
2. Add each variable above for **Production**, **Preview**, and **Development** environments

## ✅ Quick Checklist

- [ ] Add `sabalist.com` to Firebase Authorized Domains
- [ ] Add `www.sabalist.com` to Firebase Authorized Domains
- [ ] Add Vercel preview URLs to Firebase Authorized Domains
- [ ] Update Google OAuth credentials (if using Google Sign-In)
- [ ] Configure Storage CORS (if using Firebase Storage)
- [ ] Add environment variables to Vercel
- [ ] Test authentication on your live domain

## 🔍 Verification

After adding the domains, test your app:

1. Visit https://sabalist.com (once SSL is issued)
2. Try to sign in / sign up
3. Check browser console for any Firebase errors
4. Test creating a listing
5. Test uploading images (if applicable)

## 📝 Current Firebase Configuration

Your current Firebase project details:
- **Project ID**: sabalist
- **Auth Domain**: sabalist.firebaseapp.com
- **Storage Bucket**: sabalist.firebasestorage.app
- **Web App ID**: 1:231273918004:web:0020dcc14b7f52e3356461

## ⚠️ Important Notes

1. **Don't delete** existing authorized domains (like `localhost`)
2. **Keep** your `.env` file secure and never commit to Git
3. **Add** each new Vercel preview URL as you create them
4. **Test** authentication after adding domains

## 🚨 Common Errors & Solutions

### Error: "auth/unauthorized-domain"
**Solution**: Add the domain to Firebase Authorized Domains (Step 1)

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"
**Solution**: Configure Storage CORS (Step 4)

### Error: "redirect_uri_mismatch"
**Solution**: Update Google OAuth redirect URIs (Step 2)

## 🔗 Useful Links

- Firebase Console: https://console.firebase.google.com/project/sabalist
- Google Cloud Console: https://console.cloud.google.com/
- Vercel Project: https://vercel.com/afesons-projects/afrilist-mvp
- Vercel Env Variables: https://vercel.com/afesons-projects/afrilist-mvp/settings/environment-variables

---

*After completing these steps, your Firebase authentication and services will work seamlessly on sabalist.com!*
