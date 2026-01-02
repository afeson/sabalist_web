# 🔐 Firebase Email Magic Link Authentication Setup

## Overview

This guide shows you how to configure Firebase for **Email Magic Link** (passwordless) authentication in Sabalist.

**Benefits:**
- ✅ **FREE** - No SMS costs
- ✅ Works on **iOS, Android, and Web**
- ✅ **Low friction** - No passwords to remember
- ✅ **Secure** - More secure than password auth
- ✅ **African-friendly** - Email is universal, SMS costs money

---

## 📋 Prerequisites

- Firebase project created
- Firebase console access
- Your app already uses `@react-native-firebase/auth`

---

## 🔥 Firebase Console Setup

### Step 1: Enable Email Link Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Add new provider**
5. Select **Email/Password**
6. **Enable** the top toggle (Email/Password)
7. **Enable** the bottom toggle (Email link - passwordless sign-in)
8. Click **Save**

![Email Link Auth](https://firebase.google.com/docs/auth/web/email-link-auth)

---

### Step 2: Set Up Firebase Dynamic Links

Email magic links use Firebase Dynamic Links to redirect users back to your app.

#### 2.1 Create Dynamic Link Domain

1. In Firebase Console, go to **Dynamic Links** (under Engage section)
2. Click **Get Started** or **New Dynamic Link**
3. Firebase will suggest a free domain: `yourproject.page.link`
4. Accept the suggested domain: `sabalist.page.link`
5. Click **Finish**

**Important:** The domain `sabalist.page.link` must match the one in `AuthScreen.js`:

```javascript
dynamicLinkDomain: 'sabalist.page.link'
```

#### 2.2 Configure Deep Link Behavior

1. Still in Dynamic Links settings
2. Under **Advanced options**, set:
   - **iOS behavior:** Open the deep link in your iOS app
   - **Android behavior:** Open the deep link in your Android app
3. Save settings

---

### Step 3: Add Authorized Domains

Firebase needs to know which domains can send email links.

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `sabalist.page.link` (Firebase Dynamic Link domain)
   - `localhost` (for development)
   - Your production domain (if you have a web app)

---

### Step 4: Customize Email Templates (Optional)

Make the login email look professional:

1. Go to **Authentication** → **Templates** tab
2. Select **Email link sign-in**
3. Customize:
   - **From name:** Sabalist
   - **Subject:** Sign in to Sabalist
   - **Body:** Edit the template to match your branding
4. Save changes

**Recommended email template:**

```
Hello,

Click the link below to sign in to Sabalist:

%LINK%

If you didn't request this, you can safely ignore this email.

Thanks,
The Sabalist Team
```

---

## 📱 App Configuration (Already Done)

The following has already been configured in your app:

### ✅ app.json - Deep Link Configuration

```json
{
  "expo": {
    "scheme": "sabalist",
    "ios": {
      "associatedDomains": ["applinks:sabalist.page.link"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "sabalist.page.link",
              "pathPrefix": "/auth"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### ✅ AuthScreen.js - Email Link Logic

The new `AuthScreen.js` handles:
- Sending email magic links
- Receiving deep links when user clicks email
- Completing sign-in automatically

### ✅ App.js - Updated Import

Changed from `PhoneOTPScreen` to `AuthScreen`.

---

## 🧪 Testing the Setup

### Test Email Link Authentication

1. Run your app: `npm start` or `expo start`
2. On the login screen, enter a test email
3. Click "Send Login Link"
4. Check your email inbox
5. Click the link in the email
6. App should open and sign you in automatically

### Debug Checklist

If email links don't work:

- [ ] Email Link auth enabled in Firebase Console
- [ ] Dynamic Link domain created (`sabalist.page.link`)
- [ ] Authorized domains include `sabalist.page.link`
- [ ] `app.json` has correct `scheme` and `intentFilters`
- [ ] Email is valid and in your inbox (check spam)
- [ ] Deep linking is working (test with `sabalist://` URL)

**Check logs:**

```javascript
// In AuthScreen.js, you'll see:
console.log('📧 Sending magic link to:', email);
console.log('✅ Magic link sent successfully!');
console.log('🔗 Received deep link:', url);
console.log('🔐 Completing sign-in with email link...');
console.log('✅ User signed in:', result.user.uid);
```

---

## 🚀 Deployment Checklist

Before going live:

### 1. Update Dynamic Link Domain (if needed)

If you want a custom domain instead of `sabalist.page.link`:

1. Buy a domain (e.g., `link.sabalist.com`)
2. Add it in Firebase Dynamic Links settings
3. Update `AuthScreen.js`:
   ```javascript
   dynamicLinkDomain: 'link.sabalist.com'
   ```
4. Update `app.json` intent filters to use new domain

### 2. Test on Real Devices

- [ ] Test on Android device
- [ ] Test on iOS device (if applicable)
- [ ] Test email delivery (not in spam)
- [ ] Test deep link redirect

### 3. Production Email Template

- [ ] Professional email design
- [ ] Correct branding (logo, colors)
- [ ] Clear call-to-action button
- [ ] Support contact info

---

## 🔒 Security Best Practices

### 1. Email Verification

Users are automatically verified when they click the email link. No additional verification needed.

### 2. Rate Limiting

Firebase automatically rate-limits email sending to prevent abuse.

### 3. Link Expiration

Email magic links expire after **1 hour** by default. Users must request a new link after expiration.

### 4. Firestore Security Rules

Update your Firestore rules to require authenticated users:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /listings/{listingId} {
      allow read: if true; // Anyone can browse
      allow create: if request.auth != null; // Must be signed in to post
      allow update, delete: if request.auth != null &&
                               request.auth.uid == resource.data.userId;
    }

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🆚 Email Auth vs Phone Auth

| Feature | Email Magic Link | Phone SMS OTP |
|---------|-----------------|---------------|
| **Cost** | FREE | Costs per SMS |
| **Africa-friendly** | ✅ Yes | ❌ Expensive |
| **iOS Support** | ✅ Works out of box | ⚠️ Needs APNs |
| **Setup Complexity** | Easy | Complex |
| **Friction** | Very low | Low-Medium |
| **User Experience** | Click link | Type 6-digit code |
| **Delivery Speed** | Fast (email) | Sometimes delayed |
| **Works Offline** | No (needs email) | No (needs SMS) |

---

## 🔄 Migration from Phone Auth

If you want to keep phone auth as a backup option:

1. **Keep both auth methods enabled** in Firebase Console
2. Add a toggle in `AuthScreen.js`:
   ```javascript
   const [authMethod, setAuthMethod] = useState('email'); // or 'phone'
   ```
3. Show different UI based on selected method
4. Email auth is **default**, phone auth is **optional**

**Recommended approach:**
- Primary: Email Magic Link
- Optional: Google Sign-In
- Fallback: Phone OTP (only if needed)

---

## 📞 Optional: Phone Number Collection

You can still collect phone numbers WITHOUT using them for authentication:

### Add Phone Field to User Profile

1. User signs in with email
2. Navigate to Profile screen
3. Add optional phone number field:
   ```javascript
   <Input
     label="Phone Number (Optional)"
     value={phoneNumber}
     onChangeText={setPhoneNumber}
     placeholder="+234..."
   />
   ```
4. Save to Firestore user document
5. Use phone for:
   - Buyer/seller contact
   - SMS notifications (optional)
   - WhatsApp integration
   - Trust score (verified phone = higher trust)

### When to Verify Phone

Only verify phone for **high-trust actions**:
- Upgrading to Power Seller
- Posting high-value items (>$500)
- Requesting verification badge
- Withdrawing funds

This keeps login free while allowing optional phone verification later.

---

## ❓ FAQ

### Q: What if user doesn't have email?

**A:** 99% of smartphone users have email (Gmail, Yahoo, etc.). If truly needed, offer phone auth as fallback.

### Q: Can I use custom email templates?

**A:** Yes! Use Firebase Extensions like "Trigger Email" for full HTML email control with SendGrid/Mailgun.

### Q: How do I track email delivery?

**A:** Firebase logs email sends in the Auth logs. For production, use Cloud Functions to track delivery events.

### Q: What about spam filters?

**A:** Firebase email delivery is reliable. If needed, use custom SMTP (SendGrid) via Firebase Extensions.

### Q: Can I add social login?

**A:** Yes! Google Sign-In is already planned (see next section). You can also add Facebook, Apple, Twitter, etc.

---

## 🎯 Next Steps

1. ✅ Email Magic Link (completed)
2. ⏳ Google Sign-In (optional, coming next)
3. ⏳ Phone number as optional profile field
4. ⏳ Phone verification for Power Sellers only
5. ⏳ Email preferences & notifications

---

## 🐛 Troubleshooting

### Error: "unauthorized-continue-uri"

**Fix:** Add `sabalist.page.link` to Authorized Domains in Firebase Console.

### Error: Deep link not opening app

**Fix:**
1. Rebuild app after changing `app.json`
2. Run `npx expo prebuild --clean`
3. Check `scheme` in `app.json` matches your intent filters

### Email not received

**Check:**
- Email in spam folder
- Email address is valid
- Firebase quota not exceeded (free tier: 100 emails/day)
- Check Firebase Auth logs for errors

### Dynamic Link domain not working

**Fix:**
1. Wait 24 hours for DNS propagation
2. Use the free `.page.link` domain instead of custom domain
3. Verify domain ownership in Firebase Console

---

## 📚 Resources

- [Firebase Email Link Docs](https://firebase.google.com/docs/auth/web/email-link-auth)
- [Firebase Dynamic Links](https://firebase.google.com/docs/dynamic-links)
- [React Native Firebase Auth](https://rnfirebase.io/auth/usage)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)

---

## ✅ Summary

You now have:
- ✅ FREE email-based authentication
- ✅ Passwordless login (magic links)
- ✅ Deep linking configured
- ✅ iOS/Android support without SMS costs
- ✅ Production-ready auth flow

**Total cost: $0/month** (no SMS fees!)

**Next:** Set up Google Sign-In for even faster login.
