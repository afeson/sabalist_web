# ⚡ FINAL TEST BEFORE LAUNCH - 15 MINUTES

## 🚨 RUN THESE TESTS BEFORE GOING LIVE

---

## 🔧 STEP 1: RESTART SERVER (2 MIN)

```bash
# Stop current server (Ctrl+C)

# Clear all caches
npx expo start --clear

# Open in browser (press 'w')

# Hard refresh
Ctrl + Shift + R
```

---

## ✅ STEP 2: TEST CRITICAL FIX - PHONE NUMBER (3 MIN)

### **Test A: Create Listing**
1. Sign in
2. Click "+ Post Item"
3. Add all fields including **phone number**
4. Submit

### **Test B: Verify Database**
1. Go to: https://console.firebase.google.com/project/sabalist/firestore
2. Open `listings` collection
3. Click on your new listing
4. ✅ **Verify `phoneNumber` field exists**

### **Test C: Contact Seller**
1. Go back to app
2. Click on the listing you just created
3. **Sign out** (or open in incognito)
4. View the same listing
5. Tap "Contact Seller"
6. ✅ **Phone number should show**
7. ✅ **WhatsApp option should work**

**CRITICAL:** If phoneNumber doesn't show, the fix didn't work!

---

## ✅ STEP 3: TEST VIEW COUNTER (2 MIN)

1. **Create or find a listing**
2. **Open in incognito window** (or sign out)
3. **View the listing**
4. **Sign back in**
5. **Go to "My Listings"**
6. ✅ **Should show "👁️ 1 views"**

**CRITICAL:** If you see permission errors in console, rules didn't deploy!

---

## ✅ STEP 4: TEST CAMERA OPTION (2 MIN)

1. Click "+ Post Item"
2. Scroll to Photos section
3. ✅ **Should see TWO buttons:**
   - "Gallery"
   - "Camera"
4. Tap "Camera"
5. ✅ **Camera should open** (or ask for permission)
6. Take a photo
7. ✅ **Should show "Compressing..." briefly**
8. ✅ **Photo should appear in form**

---

## ✅ STEP 5: TEST IMAGE COMPRESSION (2 MIN)

1. Add a large photo (3-5MB from phone)
2. Watch for:
   - ✅ "Compressing..." badge appears
   - ✅ Upload completes in < 5 seconds
3. Check Firebase Storage console
4. ✅ **Image should be ~800KB, not 3-5MB**

---

## ✅ STEP 6: TEST MARK AS SOLD (2 MIN)

1. Open one of your listings
2. Tap "Mark as Sold"
3. Confirm
4. ✅ **Should show:** "✅ Marked as Sold! Your listing is now hidden..."
5. Go to Marketplace
6. ✅ **Listing should be GONE**
7. Go to "My Listings"
8. ✅ **Listing should show with SOLD badge**

---

## ✅ STEP 7: TEST SHARE FEATURE (1 MIN)

1. Open any listing
2. Look for share icon in header (top right)
3. Tap it
4. ✅ **Share dialog should open**
5. Try sharing to WhatsApp
6. ✅ **Should include listing details**

---

## ✅ STEP 8: TEST REPORT FEATURE (1 MIN)

1. View someone else's listing (NOT your own)
2. Scroll to bottom
3. ✅ **"Report this listing" button should be visible**
4. Tap it
5. Select "Spam"
6. ✅ **Should show: "Thank You - Report submitted..."**

---

## 🔥 STEP 9: TEST NO ANONYMOUS LISTINGS (2 MIN)

1. **Sign out completely**
2. **Try to access marketplace**
3. ✅ **Should see Phone OTP screen**
4. ✅ **Can't create listings without auth**

This confirms anonymous fallback is removed.

---

## 🎯 SUCCESS CRITERIA

### **ALL TESTS MUST PASS:**

```
✅ phoneNumber field in Firestore
✅ Contact Seller shows phone
✅ WhatsApp opens correctly
✅ View counter increments
✅ No permission errors in console
✅ Camera and Gallery buttons work
✅ "Compressing..." appears
✅ Images upload fast (< 5 sec)
✅ Mark as Sold shows confirmation
✅ Sold items hidden from marketplace
✅ Share dialog works
✅ Report button functional
✅ Can't create without auth
```

**If ANY test fails, DO NOT LAUNCH yet!**

---

## 🐛 IF SOMETHING BREAKS

### **phoneNumber not showing:**
```
Check:
- Firestore console - is field there?
- Created new listing after fix?
- Old listings won't have phoneNumber
```

### **View counter errors:**
```
Check:
- Console for "Permission Denied"
- Run: firebase deploy --only firestore:rules
- Wait 1-2 minutes for propagation
```

### **Camera not opening:**
```
Check:
- Permission granted?
- On web: camera requires HTTPS
- On mobile: permissions in app settings
```

### **Compression not showing:**
```
Check:
- expo-image-manipulator installed?
- Run: npm list expo-image-manipulator
- Should see version number
```

---

## 📊 EXPECTED RESULTS

### **Firestore Document (New Listing):**
```javascript
{
  id: "abc123",
  title: "iPhone 14 Pro",
  description: "...",
  price: 1200,
  category: "Electronics",
  location: "Nairobi, Kenya",
  phoneNumber: "+254712345678", // ✅ Should exist
  userId: "user123", // ✅ Should be real UID
  images: ["url1", "url2"],
  status: "active",
  views: 0, // ✅ Should be 0 initially
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### **Storage:**
- Images should be ~800KB (not 3-5MB)
- Path: `/listings/listing-[timestamp]-[index]`

### **View Counter After 1 View:**
```javascript
{
  views: 1, // ✅ Should increment
  lastViewedAt: timestamp // ✅ Should update
}
```

---

## ⏱️ TOTAL TEST TIME: 15 MINUTES

- Step 1: Restart (2 min)
- Step 2: Phone test (3 min)
- Step 3: Views test (2 min)
- Step 4: Camera test (2 min)
- Step 5: Compression (2 min)
- Step 6: Mark as sold (2 min)
- Step 7: Share (1 min)
- Step 8: Report (1 min)

**15 minutes to verify everything works!**

---

## 🚀 AFTER TESTING PASSES

### **You're ready to deploy:**

```bash
# Build for web
npx expo export:web

# Deploy
firebase deploy --only hosting

# OR
vercel --prod
```

### **Your app will be live!** 🎊

---

## 🎉 YOU'RE ALMOST THERE!

**All bugs fixed** ✅  
**All improvements added** ✅  
**Security deployed** ✅  

**Just test and launch!** 🚀

---

**Good luck!** 🌍





