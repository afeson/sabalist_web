# Manual Email Link Testing (Without Rebuild)

Since the custom scheme `sabalist://` is not registered in your current build, here's how to test the email link authentication manually:

## Steps:

### 1. Send Email Link
- Open the app
- Enter your email: `afeson@gmail.com`
- Click "Send Login Link"
- ✅ Email sent successfully

### 2. Get the Firebase Auth URL
- Click the email link on your device
- Browser will show: "Failed to launch 'sabalist://auth?...'"
- **Copy the full URL from the browser address bar**

It should look like:
```
https://sabalist.firebaseapp.com/__/auth/action?apiKey=AIzaSyApAyrJk0Qi9zg8_AaD5r6A084WeLVHNsU&oobCode=RU41tQKkg-hMVJ6uN2dh51pDqH3YEpTDxyLcEfDIMJ4AAAGbdfo11w&mode=signIn&lang=en
```

### 3. Test in App (Manual Entry)

Add this temporary button to AuthScreen for testing:

```javascript
// Add after line 40 in AuthScreen.js
const [testUrl, setTestUrl] = useState('');

// Add in the JSX, before the email input:
<View>
  <Text style={{ color: '#666', marginBottom: 8 }}>
    🧪 Test Email Link (Paste URL from email)
  </Text>
  <Input
    placeholder="Paste Firebase auth URL here"
    value={testUrl}
    onChangeText={setTestUrl}
    multiline
    numberOfLines={3}
  />
  <PrimaryButton
    title="Test Email Link"
    onPress={() => {
      console.log('🧪 Testing with manual URL');
      handleDynamicLink(testUrl);
    }}
    disabled={!testUrl}
    style={{ marginTop: 8, marginBottom: 16 }}
  />
</View>
```

### 4. Test Flow

1. Paste the copied URL into the test input
2. Click "Test Email Link"
3. Watch the console logs:
   - ✅ Should show: "🔗 Received URL: https://sabalist.firebaseapp.com/__/auth/action?..."
   - ✅ Should validate: "🔍 Is valid email link: true"
   - ✅ Should sign in: "✅ User signed in: [uid]"

## This Proves:

- ✅ Email link sending works
- ✅ URL validation works
- ✅ Sign-in flow works
- ✅ Code is correctly implemented

## What Doesn't Work (Until Rebuild):

- ❌ Automatic deep link opening (`sabalist://` not registered)
- ❌ Browser → App redirection

## Solution:

**Build a new Expo Dev Client:**
```bash
eas build --platform android --profile development
```

This will register the `sabalist://` scheme and enable automatic deep linking.

## After Rebuild:

The complete flow will work:
1. Click email link → Browser opens
2. Browser redirects → `sabalist://auth?...`
3. Android opens app → Deep link handled
4. App validates → Sign-in completes
5. User authenticated ✅

---

**Note:** This manual testing method is only for development/debugging. Production users will need a properly built app with the deep link scheme registered.
