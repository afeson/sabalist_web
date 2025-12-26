# Setting Up Test Phone Numbers for Firebase Phone Auth

## Quick Setup (2 Minutes)

### Step 1: Open Firebase Console

Go to: https://console.firebase.google.com/project/sabalist/authentication/providers

### Step 2: Configure Phone Provider

1. Find **"Phone"** in the list of sign-in providers
2. Click on it to open settings
3. Scroll down to **"Phone numbers for testing"** section

### Step 3: Add Test Numbers

Add these test phone numbers:

**For US Testing:**
- Phone number: `+15005550001`
- Verification code: `123456`

**For International Testing:**
- Phone number: `+254712345678` (Kenya)
- Verification code: `654321`

**For Additional Testing:**
- Phone number: `+442071234567` (UK)
- Verification code: `111111`

### Step 4: Save

Click **"Save"** at the bottom of the page.

---

## How to Test

1. **In your app** at http://localhost:19006:
   - Enter test phone number: `+15005550001`
   - Click "Send Verification Code"
   - **No real SMS is sent**
   - Enter verification code: `123456`
   - Click "Verify Code"
   - ✅ Success!

2. **Test different numbers:**
   - Try `+254712345678` with code `654321`
   - Try `+442071234567` with code `111111`

---

## Important Notes

### ✅ Benefits:
- No billing required
- Instant verification (no SMS delay)
- Perfect for development and testing
- Works offline

### ⚠️ Limitations:
- Only works with numbers you add
- Not for production users
- Real users can't sign in with these

### 🚀 For Production:
When ready to launch:
1. Upgrade to Blaze plan
2. Remove test numbers (optional)
3. Real users can use their real phone numbers

---

## After Setup

Your app will work with these test numbers immediately. No app restart needed!

**Test it now:**
1. Go to: http://localhost:19006
2. Enter: `+15005550001`
3. Click "Send Verification Code"
4. Enter: `123456`
5. Success! 🎉

---

## Troubleshooting

**"Invalid phone number"?**
- Make sure to include the `+` and country code
- Format: `+15005550001` not `5005550001`

**"Invalid verification code"?**
- Use the exact code you configured
- It's case-sensitive

**Still shows billing error?**
- Wait 1-2 minutes after adding test numbers
- Refresh your browser (Ctrl + Shift + R)
- Clear browser cache if needed

---

## Summary

✅ Firebase Console: https://console.firebase.google.com/project/sabalist/authentication/providers  
✅ Add test numbers in "Phone numbers for testing" section  
✅ Test with `+15005550001` / code `123456`  
✅ No billing required for development!  



