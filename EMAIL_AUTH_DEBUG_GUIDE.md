# Email Link Authentication - Debugging Guide

## Current Status

You're experiencing:
```
❌ Sign-in error: [Error: [auth/unknown] Given link is not a valid email link]
```

## Debug Code Added

I've added extensive logging to help identify the exact issue. When you test the email link flow, you'll see detailed console output.

## What to Check

### Test the Flow Again

1. **Send Email Link**
   - Open app
   - Enter email
   - Click "Send Login Link"

2. **Click Email Link**
   - Open email on same device
   - Click the sign-in link

3. **Check Console Logs**

You should see detailed logs like:

```
🔗 Received URL: sabalist://auth?apiKey=...&mode=signIn&oobCode=...
   URL type: string
   URL length: 250
✅ Detected sabalist:// custom scheme
   URL parts count: 2
   Base part: sabalist://auth
   Query string: apiKey=...&mode=signIn&oobCode=...
🔄 Converted custom scheme URL
   Original: sabalist://auth?apiKey=...&mode=signIn&oobCode=...
   Validation URL: https://sabalist.firebaseapp.com/__/auth/action?apiKey=...&mode=signIn&oobCode=...
🔍 About to validate URL...
   Platform: android
   Validation URL: https://sabalist.firebaseapp.com/__/auth/action?apiKey=...
🔍 Is valid email link: true/false
```

## Possible Scenarios

### Scenario 1: URL Not Being Received

**Logs show:**
```
⚠️ No URL provided to handleDynamicLink
```

**Cause:** Deep link not reaching the app

**Fix:**
- Check app.json has `"scheme": "sabalist"`
- Verify intent filters include `{ "scheme": "sabalist" }`
- Rebuild app
- Test deep link manually:
  ```bash
  adb shell am start -W -a android.intent.action.VIEW \
    -d "sabalist://auth?test=123" \
    com.sabalist.app
  ```

---

### Scenario 2: URL Missing Query Parameters

**Logs show:**
```
🔗 Received URL: sabalist://auth
⚠️ No query parameters found in sabalist:// URL
```

**Cause:** Query parameters not being passed from hosting page

**Fix:**
- Check `public/index.html` line 73:
  ```javascript
  const deepLinkUrl = `sabalist://auth${window.location.search}`;
  ```
- Verify Firebase hosting is deployed
- Check browser console when clicking email link

---

### Scenario 3: Validation Fails Despite Conversion

**Logs show:**
```
✅ Detected sabalist:// custom scheme
🔄 Converted custom scheme URL
   Validation URL: https://sabalist.firebaseapp.com/__/auth/action?apiKey=...
🔍 Is valid email link: false
❌ URL is not a valid Firebase email sign-in link
   URL breakdown:
     - Has apiKey: true
     - Has mode: true
     - Has oobCode: true
```

**Cause:** Firebase doesn't recognize the URL format even with correct parameters

**Possible Fixes:**
1. **Check Firebase Project Configuration**
   - Verify `sabalist.firebaseapp.com` is authorized domain
   - Firebase Console → Authentication → Settings → Authorized domains

2. **Verify Action URL Matches**
   - Code uses: `https://sabalist.firebaseapp.com/__/auth/action`
   - Email should use same domain

3. **Test with Original HTTPS URL**
   - Don't use hosting redirect temporarily
   - Test if direct HTTPS link works

---

### Scenario 4: URL Format Incorrect

**Logs show:**
```
ℹ️ URL is not sabalist:// scheme, using as-is
   URL starts with: https://sabalist.firebaseapp.com/__/auth/action
```

**Cause:** Hosting page not redirecting to sabalist:// scheme

**Fix:**
- Check `public/index.html` redirect logic
- Verify browser console shows:
  ```
  🔗 Firebase email sign-in link detected
  📱 Attempting to open app: sabalist://auth?...
  ```
- If not redirecting, check hosting deployment

---

## Debug Actions

### 1. Check What URL Format the App Receives

Run the app and check console. The first log should be:
```
🔗 Received URL: [the actual URL]
```

**Share this URL format** - it will tell us exactly what's happening.

### 2. Verify Firebase Hosting is Working

Open in browser: `https://sabalist.firebaseapp.com`

**Expected:** Redirect page loads (not "Site Not Found")

### 3. Test Email Link in Browser First

1. Click email link on computer (not phone)
2. Open browser console (F12)
3. Check JavaScript console logs:
   ```
   🔗 Firebase email sign-in link detected
   Query params: ?apiKey=...&mode=signIn&oobCode=...
   📱 Attempting to open app: sabalist://auth?apiKey=...
   ```

This confirms the redirect logic is working.

### 4. Test Deep Link Manually

```bash
# Create a test deep link with fake params
adb shell am start -W -a android.intent.action.VIEW \
  -d "sabalist://auth?apiKey=test&mode=signIn&oobCode=test" \
  com.sabalist.app
```

**Expected:** App opens and logs show URL received

---

## Quick Tests

### Test 1: Is Firebase Hosting Deployed?

```bash
curl https://sabalist.firebaseapp.com
```

**Expected:** HTML content (not 404)

### Test 2: Does App Respond to Deep Links?

```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "sabalist://test" \
  com.sabalist.app
```

**Expected:** App opens

### Test 3: Are Parameters Being Passed?

Check browser console when clicking email link. Should show:
```
Query params: ?apiKey=AIzaSy...&mode=signIn&oobCode=abc...
```

---

## What to Share for Help

If still not working, please share:

1. **Complete console logs** when clicking email link (all the 🔗 🔄 🔍 messages)

2. **Email link URL** (from email - you can mask sensitive parts but show the structure)

3. **Browser console logs** when clicking link (F12 → Console)

4. **Firebase Hosting status**
   - Does `https://sabalist.firebaseapp.com` load?
   - What does it show?

5. **App configuration**
   - `app.json` scheme value
   - Intent filters configuration

---

## Common Issues & Solutions

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No URL received | Deep link not working | Check intent filters, rebuild app |
| URL missing params | Hosting not passing params | Check `public/index.html` line 73 |
| Validation fails | Wrong URL format | Verify conversion logic |
| Browser doesn't redirect | Hosting not deployed | Run `firebase deploy --only hosting` |
| App doesn't open | Intent filters wrong | Rebuild with correct app.json |

---

## Next Steps

1. **Test again** with new debug code
2. **Check all console logs** (copy everything)
3. **Share the logs** - especially:
   - `🔗 Received URL: ...`
   - `🔄 Converted custom scheme URL`
   - `🔍 Is valid email link: ...`
   - Any error messages

This will help us pinpoint exactly what's going wrong!
