# 🗑️ ACCOUNT DELETION PAGE - DEPLOYMENT GUIDE

## ✅ FILE CREATED

**File:** `delete-account.html`

A complete, Google Play-compliant account deletion page for Sabalist.

---

## 📋 GOOGLE PLAY REQUIREMENTS MET

✅ **Publicly accessible** - No login required
✅ **HTTPS compatible** - Works with secure hosting
✅ **Mobile-friendly** - Responsive design
✅ **Clear instructions** - Step-by-step deletion process
✅ **Contact information** - support@sabalist.com
✅ **Data deletion details** - What's deleted and retained
✅ **Timeframe specified** - 7 business days
✅ **Plain HTML** - No frameworks, works everywhere

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Firebase Hosting (Recommended)

Since you already have Firebase setup for Sabalist:

#### Step 1: Update Firebase Hosting Configuration

```bash
# In your project root
mkdir -p public/delete-account
cp delete-account.html public/delete-account/index.html
```

#### Step 2: Update firebase.json

Add the delete-account route:

```json
{
  "hosting": {
    "public": "public",
    "rewrites": [
      {
        "source": "/delete-account",
        "destination": "/delete-account/index.html"
      }
    ]
  }
}
```

#### Step 3: Deploy

```bash
firebase deploy --only hosting
```

**Result:** Page will be live at:
- `https://sabalist.web.app/delete-account`
- `https://sabalist.firebaseapp.com/delete-account`

---

### Option 2: Custom Domain (sabalist.com)

If you have a custom domain:

#### Step 1: Upload to Your Hosting

Upload `delete-account.html` to your web server at:
```
/public_html/delete-account/index.html
```

#### Step 2: Test

Visit: `https://sabalist.com/delete-account`

---

### Option 3: GitHub Pages (Free)

#### Step 1: Create GitHub Repository

```bash
# Create a new repo called "sabalist-support"
# Or use existing repo
```

#### Step 2: Create delete-account Directory

```bash
mkdir delete-account
cp delete-account.html delete-account/index.html
git add delete-account/
git commit -m "Add account deletion page"
git push
```

#### Step 3: Enable GitHub Pages

1. Go to repo Settings → Pages
2. Select branch: `main`
3. Select folder: `/ (root)`
4. Save

**Result:** Page will be live at:
`https://yourusername.github.io/sabalist-support/delete-account/`

---

### Option 4: Netlify (Free & Easy)

#### Step 1: Create Netlify Account

Go to https://netlify.com and sign up

#### Step 2: Drag & Drop

1. Create folder structure:
   ```
   sabalist-delete/
   └── delete-account/
       └── index.html  (your file)
   ```

2. Drag the `sabalist-delete` folder to Netlify

**Result:** Instant deployment at:
`https://your-site.netlify.app/delete-account/`

Can add custom domain later.

---

## 🔗 GOOGLE PLAY CONSOLE SETUP

### Where to Add the URL

1. **Open Google Play Console**
2. Go to: **Policy** → **App content**
3. Find: **Data safety** section
4. Under "Account deletion" add URL:

```
https://sabalist.web.app/delete-account
```

Or your custom domain:

```
https://sabalist.com/delete-account
```

### Verification

Google Play will check:
- ✅ URL is publicly accessible
- ✅ HTTPS enabled
- ✅ Page loads on mobile
- ✅ Clear deletion instructions
- ✅ Contact information present

---

## 📱 MOBILE PREVIEW

The page is fully responsive and looks great on:
- ✅ Mobile phones (320px+)
- ✅ Tablets (768px+)
- ✅ Desktop (1024px+)

---

## 🎨 PAGE FEATURES

### Visual Design
- Clean, professional layout
- Sabalist branding (red #E50914)
- Clear typography
- Mobile-optimized spacing

### Content Sections
1. **Header** - Sabalist logo and tagline
2. **Warning Alert** - Permanent deletion notice
3. **Step-by-Step Instructions** - 5 clear steps
4. **Contact Information** - Email and subject line
5. **Data Deletion List** - What gets deleted
6. **Data Retention** - What's kept (legal)
7. **Timeframe** - 7 business days
8. **Alternatives** - Before you delete
9. **Help Section** - Support contact
10. **Footer** - Links to other pages

---

## ✏️ CUSTOMIZATION

### Change Email Address

Line 292:
```html
<div class="contact-value">support@sabalist.com</div>
```

### Change Deletion Timeframe

Line 260:
```html
<div class="step-description">Your account and data will be permanently deleted within 7 business days of your request.</div>
```

And line 343:
```html
<p><strong>Your account will be fully deleted within 7 business days</strong>
```

### Change App Name

Search and replace "Sabalist" with your app name.

---

## 🧪 TESTING

### Test Checklist

- [ ] Open page on mobile browser
- [ ] Open page on desktop browser
- [ ] Check all text is readable
- [ ] Verify contact email is correct
- [ ] Test on different screen sizes
- [ ] Check HTTPS works
- [ ] Verify no console errors

### Test URLs

After deployment, test these URLs:

**Firebase Hosting:**
```
https://sabalist.web.app/delete-account
https://sabalist.firebaseapp.com/delete-account
```

**Custom Domain:**
```
https://sabalist.com/delete-account
https://www.sabalist.com/delete-account
```

### Mobile Testing

Use Chrome DevTools:
1. Press F12
2. Click device toggle (phone icon)
3. Select "iPhone 12 Pro" or "Pixel 5"
4. Reload page

---

## 📧 EMAIL TEMPLATE FOR USERS

When users email `support@sabalist.com`, they should write:

**Subject:** Delete My Account

**Body:**
```
Hi Sabalist Support,

I would like to delete my account.

Account email: [their email]
Phone number: [if applicable]
Reason: [optional]

Thank you.
```

---

## 🔒 PRIVACY COMPLIANCE

The page complies with:

✅ **GDPR** (European Union)
- Right to erasure (Article 17)
- Clear deletion process
- Data retention transparency

✅ **CCPA** (California)
- Consumer data deletion rights
- Clear contact information

✅ **Google Play Policies**
- User data deletion requirement
- Publicly accessible URL
- Clear instructions

---

## 🚨 IMPORTANT NOTES

### 1. Actual Account Deletion

This page provides instructions. You need to:

- Monitor `support@sabalist.com` for deletion requests
- Verify user identity (email match)
- Delete user data from Firebase:
  - Firestore user documents
  - Firebase Auth accounts
  - Firebase Storage files
- Confirm deletion within 7 days

### 2. Automation (Optional)

Consider building an automated deletion system:

```javascript
// Firebase Cloud Function example
exports.deleteAccount = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;

  // Delete Firestore data
  await admin.firestore().collection('users').doc(uid).delete();

  // Delete listings
  const listings = await admin.firestore()
    .collection('listings')
    .where('userId', '==', uid)
    .get();

  listings.forEach(doc => doc.ref.delete());

  // Delete storage files
  await admin.storage().bucket().deleteFiles({
    prefix: `users/${uid}/`
  });

  // Delete auth account
  await admin.auth().deleteUser(uid);

  return { success: true };
});
```

### 3. Email Response Template

When you receive deletion requests, respond with:

```
Subject: Account Deletion Request Received - Sabalist

Dear [User],

We have received your request to delete your Sabalist account
associated with [email].

Your account and all associated data will be permanently deleted
within 7 business days.

You will receive a confirmation email once the deletion is complete.

If you did not request this deletion, please reply to this email
immediately.

Best regards,
Sabalist Support Team
support@sabalist.com
```

---

## 📊 ANALYTICS (Optional)

Track page visits to understand deletion request volume:

```html
<!-- Add before </body> if you have Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## ✅ DEPLOYMENT CHECKLIST

Before submitting to Google Play:

- [ ] Page deployed to production URL
- [ ] URL is HTTPS
- [ ] Page loads correctly on mobile
- [ ] Email address is correct: support@sabalist.com
- [ ] All text is accurate for your app
- [ ] No broken links
- [ ] Page is indexed (or set noindex if preferred)
- [ ] URL added to Google Play Console
- [ ] System in place to handle deletion requests
- [ ] Email monitoring setup for support@sabalist.com

---

## 🎯 RECOMMENDED DEPLOYMENT

For Sabalist, I recommend **Firebase Hosting** because:

✅ You already use Firebase
✅ Free HTTPS included
✅ Custom domain support
✅ Fast global CDN
✅ Easy deployment
✅ Automatic SSL certificates

**Quick Deploy:**

```bash
# Create directory
mkdir -p public/delete-account

# Copy file
cp delete-account.html public/delete-account/index.html

# Deploy
firebase deploy --only hosting

# Your URL will be:
# https://sabalist.web.app/delete-account
```

---

## 📞 SUPPORT

If you need help with deployment, check:

- **Firebase Hosting Docs:** https://firebase.google.com/docs/hosting
- **Google Play Data Safety:** https://support.google.com/googleplay/android-developer/answer/10787469
- **GDPR Compliance:** https://gdpr.eu/right-to-be-forgotten/

---

Last Updated: 2026-01-01
