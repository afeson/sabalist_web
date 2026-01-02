# 🏗️ Sabalist Authentication Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Sabalist Mobile App                     │
│                  (Expo + React Native + Firebase)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────┐                      ┌─────────────────┐
│   Guest Mode    │                      │  Authenticated  │
│  (Not Signed)   │                      │   (Signed In)   │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │  CAN:                                  │  CAN:
         │  • Browse listings                     │  • Everything in Guest
         │  • Search                              │  • Create listings
         │  • Filter                              │  • Edit own listings
         │  • View details                        │  • Favorite items
         │                                        │  • Contact sellers
         │  CANNOT:                               │  • Manage profile
         │  • Create listings                     │  • View favorites
         │  • Favorite items                      │
         │  • Contact sellers                     │
         │                                        │
         ▼                                        ▼
    ┌────────┐                             ┌──────────┐
    │ Browse │                             │ Full App │
    │  Only  │                             │  Access  │
    └────────┘                             └──────────┘
```

---

## Authentication Methods

### 🎯 PRIMARY: Email Magic Link (Passwordless)

```
┌──────────────────────────────────────────────────────────────┐
│                      Email Magic Link Flow                    │
└──────────────────────────────────────────────────────────────┘

Step 1: User enters email
┌────────────────────────────────────────────┐
│           AuthScreen.js                    │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Email: [user@email.com___________]  │ │
│  │                                      │ │
│  │  [Send Login Link]                   │ │
│  └──────────────────────────────────────┘ │
└───────────────────┬────────────────────────┘
                    │
                    │ sendMagicLink()
                    ▼
        ┌──────────────────────────┐
        │   Firebase Auth API      │
        │                          │
        │  sendSignInLinkToEmail() │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │    Firebase Backend      │
        │                          │
        │  • Generate unique link  │
        │  • Set 1-hour expiry     │
        │  • Send email            │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   Firebase Dynamic Link  │
        │                          │
        │  https://sabalist.       │
        │  page.link/auth?...      │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │    User's Email Inbox    │
        │                          │
        │  From: Sabalist          │
        │  Subject: Sign in        │
        │  [Click to Sign In]      │
        └──────────┬───────────────┘
                   │
                   │ User clicks link
                   ▼
        ┌──────────────────────────┐
        │   Deep Link Handler      │
        │   (OS-level redirect)    │
        │                          │
        │  Opens: Sabalist app     │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │    AuthScreen.js         │
        │    useEffect() hook      │
        │                          │
        │  Linking.addEventListener│
        └──────────┬───────────────┘
                   │
                   │ Detects email link
                   ▼
        ┌──────────────────────────┐
        │   Firebase Auth API      │
        │                          │
        │  signInWithEmailLink()   │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │    Auth State Change     │
        │                          │
        │  onAuthStateChanged()    │
        │  fires in App.js         │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   User Signed In! 🎉     │
        │                          │
        │  Navigate to Home        │
        └──────────────────────────┘
```

**Pros:**
- ✅ FREE (no SMS costs)
- ✅ Works on iOS/Android/Web
- ✅ No password to remember
- ✅ More secure (links expire)
- ✅ Low friction (click link)

**Cons:**
- ⚠️ Requires email access
- ⚠️ Slight delay (wait for email)

---

### 🔄 SECONDARY: Google Sign-In (One-Tap)

```
┌──────────────────────────────────────────────────────────────┐
│                      Google Sign-In Flow                      │
└──────────────────────────────────────────────────────────────┘

Step 1: User clicks Google button
┌────────────────────────────────────────────┐
│           AuthScreen.js                    │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │  [G] Continue with Google            │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
└───────────────────┬────────────────────────┘
                    │
                    │ signInWithGoogle()
                    ▼
        ┌──────────────────────────┐
        │   Google Sign-In SDK     │
        │                          │
        │  • Show account picker   │
        │  • User selects account  │
        │  • Get Google ID token   │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   Firebase Auth API      │
        │                          │
        │  signInWithCredential()  │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   User Signed In! 🎉     │
        │                          │
        │  Navigate to Home        │
        └──────────────────────────┘
```

**Status:** UI ready, implementation pending

**Pros:**
- ✅ FREE
- ✅ Instant (no email wait)
- ✅ One-tap login
- ✅ Trusted brand

**Cons:**
- ⚠️ Requires Google account
- ⚠️ Needs extra SDK setup

---

### 📱 OPTIONAL: Phone Number (Profile Only)

```
┌──────────────────────────────────────────────────────────────┐
│                Phone Number Collection (Optional)             │
└──────────────────────────────────────────────────────────────┘

Phone is NO LONGER used for login.
Only stored for:
  • Buyer/seller contact
  • WhatsApp integration
  • Power Seller verification
  • Trust score

Where to collect:
  1. Profile screen (optional field)
  2. First listing creation (prompt)
  3. Power Seller upgrade (required)

Verification only needed for high-trust actions.
```

---

## File Structure

```
Sabalist/
│
├── App.js                          ← Entry point, auth routing
│   └── onAuthStateChanged()        ← Listens to Firebase auth state
│
├── app.json                        ← Deep link config
│   ├── scheme: "sabalist"
│   ├── ios.associatedDomains
│   └── android.intentFilters
│
├── src/
│   │
│   ├── lib/
│   │   └── firebase.js             ← Firebase SDK exports
│   │       ├── auth
│   │       ├── firestore
│   │       └── storage
│   │
│   ├── screens/
│   │   ├── AuthScreen.js           ← NEW: Email magic link UI
│   │   │   ├── sendMagicLink()
│   │   │   ├── useEffect() → deep link handler
│   │   │   └── completeSignIn()
│   │   │
│   │   ├── PhoneOTPScreen.js       ← OLD: Not used anymore
│   │   │                              (kept for reference)
│   │   │
│   │   └── ProfileScreen.js        ← Sign out button
│   │       └── auth().signOut()
│   │
│   └── navigation/
│       └── MainTabNavigator.js     ← Post-auth navigation
│           ├── Home
│           ├── Favorites
│           ├── CreateListing
│           ├── MyListings
│           └── Profile
│
└── Documentation/
    ├── QUICK_START_AUTH.md         ← 5-minute setup guide
    ├── FIREBASE_EMAIL_AUTH_SETUP.md ← Full setup guide
    ├── AUTH_MIGRATION_COMPLETE.md  ← Migration summary
    └── AUTH_ARCHITECTURE.md        ← This file
```

---

## Authentication State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    App.js (Root Component)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
              ┌───────────────▼───────────────┐
              │  useEffect() on mount         │
              │                               │
              │  auth().onAuthStateChanged()  │
              │  ↓                            │
              │  Sets: user state             │
              │  Sets: loading = false        │
              └───────────────┬───────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
    user === null                              user !== null
         │                                         │
         ▼                                         ▼
┌─────────────────┐                      ┌─────────────────┐
│   AuthScreen    │                      │ NavigationCont. │
│   (Login UI)    │                      │  + MainTabs     │
└─────────────────┘                      └─────────────────┘
         │                                         │
         │                                         │
    User signs in                             User signs out
         │                                         │
         │                                         │
         └──────────┬──────────────────────────────┘
                    │
                    ▼
         onAuthStateChanged() fires again
                    │
                    │
            Updates user state
                    │
                    ▼
            UI automatically updates
```

**Key Points:**
- Single source of truth: `auth().onAuthStateChanged()`
- Automatic navigation based on auth state
- Persistent across app restarts
- No manual state management needed

---

## Data Flow

### User Creation

```
User signs in with email
         ↓
Firebase Auth creates user
         ↓
auth().currentUser populated
         ↓
Firestore creates user document (optional)
         ↓
User can now create listings
```

### Listing Creation

```
User creates listing
         ↓
Check: auth().currentUser exists?
         ↓
Add userId to listing document
         ↓
Save to Firestore /listings/{id}
         ↓
Set userId field for ownership
```

### Listing Ownership

```
listings/abc123/
  ├── title: "iPhone 14"
  ├── price: 50000
  ├── userId: "xyz789"  ← Links to auth user
  ├── userEmail: "user@email.com"
  └── createdAt: timestamp
```

---

## Security Rules

### Firestore Security

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function: Check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Listings
    match /listings/{listingId} {
      // Anyone can read (browse marketplace)
      allow read: if true;

      // Must be signed in to create
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;

      // Only owner can update/delete
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Users
    match /users/{userId} {
      // Anyone signed in can read profiles
      allow read: if isAuthenticated();

      // Only owner can write their profile
      allow write: if isOwner(userId);
    }

    // Favorites
    match /favorites/{userId} {
      // Only owner can read/write their favorites
      allow read, write: if isOwner(userId);
    }
  }
}
```

---

## Cost Analysis

### Monthly Active Users: 10,000

#### Before (Phone OTP)
```
Login frequency: 5x/month per user
Total logins: 50,000/month
SMS cost: $0.04 per SMS (Africa average)

Total cost: 50,000 × $0.04 = $2,000/month
Annual cost: $24,000/year
```

#### After (Email Magic Link)
```
Login frequency: 5x/month per user
Total logins: 50,000/month
Email cost: $0 (Firebase free)

Total cost: $0/month
Annual cost: $0/year

SAVINGS: $24,000/year 💰
```

### At Scale (100,000 MAU)
```
Before: $20,000/month in SMS costs
After:  $0/month
SAVINGS: $240,000/year 🚀
```

---

## Performance Metrics

### Login Time Comparison

**Phone OTP:**
```
1. Enter phone number:        5 sec
2. Wait for SMS:              15-30 sec
3. Enter 6-digit code:        10 sec
4. Verify code:               2 sec
───────────────────────────────────
Total:                        32-47 sec
```

**Email Magic Link:**
```
1. Enter email:               5 sec
2. Open email app:            3 sec
3. Click link:                1 sec
4. App opens + sign in:       2 sec
───────────────────────────────────
Total:                        11 sec

Time saved: ~30 seconds per login
```

---

## Browser vs Native Support

### Email Magic Link

| Platform | Support | Setup Required |
|----------|---------|----------------|
| **Android** | ✅ Full | Deep links in app.json |
| **iOS** | ✅ Full | Associated domains |
| **Web** | ✅ Full | Same domain redirect |

### Phone OTP

| Platform | Support | Setup Required |
|----------|---------|----------------|
| **Android** | ✅ Full | google-services.json + SHA-1 |
| **iOS** | ⚠️ Complex | APNs certificates |
| **Web** | ⚠️ Limited | reCAPTCHA required |

**Winner:** Email Magic Link (works everywhere)

---

## Error Handling

### Common Errors

#### Email Magic Link
```javascript
// Invalid email
auth/invalid-email
→ "Please enter a valid email address"

// Unauthorized domain
auth/unauthorized-continue-uri
→ Add domain to Firebase Authorized domains

// Link expired
auth/expired-action-code
→ "This link has expired. Request a new one."

// Invalid link
auth/invalid-action-code
→ "Invalid link. Request a new sign-in link."
```

#### Deep Linking
```javascript
// App doesn't open
→ Rebuild after app.json changes
→ Check scheme matches

// Link opens browser instead of app
→ Add intent filters (Android)
→ Add associated domains (iOS)
```

---

## Testing Strategy

### Unit Tests
```javascript
// AuthScreen.js
test('validates email format', () => {
  expect(isValidEmail('user@email.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
});

test('sends magic link on valid email', async () => {
  await sendMagicLink('user@email.com');
  expect(auth().sendSignInLinkToEmail).toHaveBeenCalled();
});
```

### Integration Tests
```javascript
test('complete email auth flow', async () => {
  // 1. Send magic link
  await sendMagicLink('test@example.com');

  // 2. Simulate deep link click
  const link = await getTestEmailLink();
  await handleDeepLink(link);

  // 3. Verify user is signed in
  expect(auth().currentUser).toBeTruthy();
});
```

### Manual Tests
```
✅ Email sent successfully
✅ Email received (check spam)
✅ Link opens app
✅ User signed in
✅ Can sign out
✅ Can sign in again
✅ Works on real device
✅ Works on different email providers
```

---

## Monitoring & Analytics

### Key Metrics to Track

```javascript
// Email link sent
analytics.logEvent('email_link_sent', {
  email_domain: email.split('@')[1]
});

// Email link clicked
analytics.logEvent('email_link_clicked', {
  time_since_sent: timeDiff
});

// Sign-in success
analytics.logEvent('login', {
  method: 'email_link',
  time_to_complete: totalTime
});

// Sign-in failure
analytics.logEvent('login_failed', {
  method: 'email_link',
  error_code: e.code
});
```

### Dashboard Metrics
- **Conversion rate:** emails sent → sign-ins
- **Time to sign in:** average time from email send to completion
- **Drop-off points:** where users abandon flow
- **Email provider breakdown:** Gmail vs Yahoo vs others
- **Error rates:** by error code

---

## Future Enhancements

### Phase 2: Google Sign-In
```
Timeline: 1-2 days
Complexity: Low
Dependencies:
  - @react-native-google-signin/google-signin
  - Firebase OAuth credentials
```

### Phase 3: Apple Sign-In
```
Timeline: 2-3 days
Complexity: Medium
Dependencies:
  - Apple Developer account
  - @invertase/react-native-apple-authentication
Required for: iOS App Store submission
```

### Phase 4: Phone Verification (Optional)
```
Timeline: 1 day
Complexity: Low
Use case: Power Seller upgrades only
Keep existing PhoneOTPScreen.js for this
```

---

## Comparison Table

| Feature | Phone OTP | Email Link | Google | Apple |
|---------|-----------|------------|--------|-------|
| **Cost** | ~$0.04/user | FREE | FREE | FREE |
| **Setup** | Complex | Easy | Easy | Medium |
| **iOS** | APNs needed | Works | Works | Works |
| **Android** | Works | Works | Works | N/A |
| **Web** | reCAPTCHA | Works | Works | N/A |
| **Friction** | Type code | Click link | 1-tap | 1-tap |
| **Security** | Medium | High | High | High |
| **Africa** | Expensive | ✅ Best | Good | N/A |

**Recommendation:** Email Magic Link + Google Sign-In

---

## Summary

### Architecture Highlights

✅ **Single Source of Truth**
- `auth().onAuthStateChanged()` drives all auth state

✅ **Automatic Navigation**
- Auth state → UI update (no manual routing)

✅ **Secure by Default**
- Firebase handles all auth complexity
- Email links expire automatically
- Deep links verified by OS

✅ **Cost-Effective**
- Zero SMS costs
- Firebase free tier sufficient
- Scales to millions of users

✅ **Developer-Friendly**
- Clean separation of concerns
- Minimal boilerplate
- Easy to test

✅ **User-Friendly**
- 30 seconds faster than SMS
- Works on all platforms
- No passwords to remember

---

**Architecture designed for African markets**
*Low cost, high reliability, mobile-first* 🚀
