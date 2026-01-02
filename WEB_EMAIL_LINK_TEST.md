# Email Magic Link - Web Test Guide

## Current Implementation ✅

The code now follows Firebase Web SDK best practices:

```javascript
// 1. Send email with link
sendSignInLinkToEmail(auth, email, {
  url: window.location.origin, // http://localhost:8081
  handleCodeInApp: true,
})

// 2. Save email to localStorage
localStorage.setItem('emailForSignIn', email);

// 3. On page load, check URL for email link
const currentUrl = window.location.href;
if (isSignInWithEmailLink(auth, currentUrl)) {
  const savedEmail = localStorage.getItem('emailForSignIn');
  signInWithEmailLink(auth, savedEmail, currentUrl);
}
```

## Test Steps

### 1. Open Web App
The app should be running at: http://localhost:8081

### 2. Send Email Magic Link

1. Enter your email address
2. Click "Send Login Link"
3. **Check browser console** - should see:
   ```
   📧 Sending magic link to: your@email.com
   ✅ Magic link sent successfully!
   ```

### 3. Check Email

The email should now contain:
- **Subject:** "Sign in to <your-app>"
- **Blue button:** "Sign in to <your-app>"
- **Link format:** `http://localhost:8081/?mode=signIn&oobCode=ABC123...&apiKey=...`

### 4. Click Email Link

**Two scenarios:**

#### A) Same Browser/Device (Recommended)
- Click link from email
- Browser opens `http://localhost:8081/?mode=signIn&oobCode=...`
- Email is retrieved from localStorage
- **Auto sign-in happens** ✅

**Console should show:**
```
🔗 Checking URL for email link: http://localhost:8081/?mode=signIn&oobCode=...
🔍 Is valid email link: true
✅ Processing Firebase email link
🔐 Completing sign-in with email link...
✅ User signed in: xyz789abc
✅ Sign-in complete. Auth state listener will handle navigation.
✅ Auth state: USER SIGNED IN
```

#### B) Different Browser/Device
- Click link from email
- Browser opens but localStorage is empty
- **Prompt appears:** "Please confirm your email address to complete sign-in:"
- Enter the same email you used
- Sign-in completes ✅

### 5. Verify Navigation

After successful sign-in:
- Loading spinner disappears
- Main app loads (listings, profile, etc.)

## Troubleshooting

### Email has no clickable link

**Cause:** Firebase Console not configured

**Fix:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Click "Email/Password" to expand
3. Toggle ON: "Email link (passwordless sign-in)"
4. Save and try again

### Link doesn't work / Invalid action code

**Cause:** Link expired or already used

**Fix:**
- Email links expire after 1 hour
- Can only be used once
- Request a new link

### "localhost is not authorized"

**Cause:** localhost not in authorized domains

**Fix:**
1. Firebase Console → Authentication → Settings
2. Authorized domains tab
3. Add `localhost` if missing

### App doesn't auto sign-in

**Cause:** localStorage cleared or different browser

**Fix:**
- Use same browser where you sent the link
- Or enter email when prompted

## Expected Behavior Summary

✅ Email sends successfully
✅ Email contains clickable link
✅ Link points to localhost with Firebase params
✅ Clicking link opens app
✅ Auto sign-in if same browser
✅ Prompt for email if different browser
✅ Navigation to main app after sign-in

## Production Notes

When deploying to production (e.g., https://sabalist.web.app):

1. The `window.location.origin` will automatically use the production URL
2. Make sure production domain is in Firebase authorized domains
3. Email links will point to production URL
4. Everything else stays the same ✅
