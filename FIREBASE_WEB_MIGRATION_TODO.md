# Firebase Web SDK Migration - Remaining Work

## Status

✅ **Completed:**
- App.js - auth state listener
- AuthScreen.js - email magic link authentication  
- CreateListingScreen.js - auth import updated

⚠️ **Partially Complete:**
- src/services/listings.js - createListing() updated, but other functions need updating

❌ **Not Started:**
- Other screens that use Firebase
- Other services that use Firebase

## listings.js - Remaining Updates

The file has 357 lines with multiple Firebase calls. Here's what needs updating:

### Pattern to Replace:

**Old (React Native Firebase):**
```javascript
firestore().collection("listings").doc(id).get()
firestore().collection("listings").add(data)
firestore().collection("listings").doc(id).update(data)
firestore().collection("listings").doc(id).delete()
firestore().collection("listings").where().orderBy().limit()
storage().ref(path).put(blob)
storage().ref(path).getDownloadURL()
```

**New (Web SDK):**
```javascript
import { collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

getDoc(doc(firestore, "listings", id))
addDoc(collection(firestore, "listings"), data)
updateDoc(doc(firestore, "listings", id), data)
deleteDoc(doc(firestore, "listings", id))
getDocs(query(collection(firestore, "listings"), where(...), orderBy(...), limit(...)))
uploadBytes(ref(storage, path), blob)
getDownloadURL(ref(storage, path))
```

### Lines to Update in listings.js:

- Line 98, 105: fetchListings() - query builder
- Line 178: getListingById() - doc get
- Line 201: getUserListings() - query
- Line 255, 270, 289, 308: update functions
- Line 337: deleteListingImages() - storage ref
- Line 349: deleteListing() - doc delete

## Recommendation for Web Testing

Since image upload and listing management is complex, for **web testing** you can:

1. **Focus on authentication** - email magic link ✅
2. **View listings only** - read operations are simpler
3. **Skip create/edit** - these require full migration

## For Production (Android)

You'll need to:
1. Keep dual configs: `firebase.js` (React Native) and `firebase.web.js` (Web)
2. Use platform detection to import the right one
3. OR complete full migration to Web SDK (supports both platforms)

## Quick Fix for Now

To test web without errors, you can disable create listing:

```javascript
// In CreateListingScreen.js, add at top:
if (typeof window !== 'undefined') {
  // Web - show message
  return (
    <View>
      <Text>Create Listing is only available on mobile app</Text>
    </View>
  );
}
```
