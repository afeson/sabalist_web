# Firebase Email Link Setup Required

## Why There's No Link in Email

Firebase Email Link authentication requires configuration in Firebase Console before it will generate clickable links.

## Steps to Fix

### 1. Go to Firebase Console
https://console.firebase.google.com/

### 2. Select Your Project
Select "sabalist"

### 3. Enable Email Link Sign-In

1. Click **Authentication** in left sidebar
2. Click **Sign-in method** tab
3. Find **Email/Password** provider
4. Click to expand it
5. Toggle ON: **"Email link (passwordless sign-in)"**
6. Click **Save**

### 4. Configure Authorized Domains

1. Still in **Authentication** → **Settings** tab
2. Click **Authorized domains**
3. Ensure these domains are listed:
   - `localhost` ✅
   - `sabalist.firebaseapp.com` ✅
   - `sabalist.web.app` (add if missing)

### 5. Test Again

After enabling in Firebase Console:

1. Reload your web app
2. Enter email and click "Send Login Link"
3. Check email - it should now have a blue clickable button

## Expected Email Format

After configuration, the email will have:
- Subject: "Sign in to Sabalist"
- Blue button: "Sign in to Sabalist"
- The button links to: `https://sabalist.firebaseapp.com/__/auth/action?mode=signIn&oobCode=...`

## Troubleshooting

**If still no link:**
- Clear browser cache
- Wait 1-2 minutes after enabling (Firebase propagation)
- Check spam folder
- Try different email address

**Email arrives but link doesn't work:**
- Make sure you enabled "Email link (passwordless sign-in)", NOT just "Email/Password"
- The toggle is inside the Email/Password provider settings
