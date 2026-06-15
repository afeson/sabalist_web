// Account deletion — required by App Store guideline 5.1.1 (Privacy:
// Data Collection and Storage). Removes the user's data from Firestore
// and deletes the Firebase Auth user. On `auth/requires-recent-login`
// the caller should prompt the user to sign in again and retry.
//
// Implementation notes:
//  - Uses the JS-SDK Firestore on mobile (the project is split: native
//    Firebase Auth + JS-SDK Firestore) so the same code paths work on
//    iOS/Android/web.
//  - Best-effort deletion of nested data (favorites, settings) — we do
//    NOT abort on a single sub-delete failure because the user-visible
//    contract is "auth account is gone, you cannot sign back in." For
//    full cascading cleanup, see TODO below about a Cloud Function
//    trigger on auth user delete.

import auth from '@react-native-firebase/auth';
import {
  firestore,
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
} from '../lib/firebase';

async function tryDelete(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.warn(`deleteAccount: ${label} failed (continuing):`, e?.message);
  }
}

async function deleteCollection(colRef) {
  const snap = await getDocs(colRef);
  await Promise.all(
    snap.docs.map((d) =>
      tryDelete(`doc ${d.ref.path}`, () => deleteDoc(d.ref))
    )
  );
}

/**
 * Deletes the current user's account end-to-end.
 *
 * Throws:
 *   - 'auth/no-user' if not signed in
 *   - 'auth/requires-recent-login' if the session is too old (caller
 *     should re-authenticate the user and retry)
 *   - other Firebase auth error codes on auth user deletion failure
 */
export async function deleteCurrentAccount() {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw Object.assign(new Error('Not signed in'), { code: 'auth/no-user' });
  }
  const uid = currentUser.uid;
  console.log('deleteAccount: starting for uid', uid);

  // 1. Delete the user's listings (best effort).
  await tryDelete('listings', async () => {
    const listingsRef = collection(firestore, 'listings');
    const q = query(listingsRef, where('userId', '==', uid));
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        tryDelete(`listing ${d.id}`, () => deleteDoc(d.ref))
      )
    );
  });

  // 2. Delete sub-collections under users/{uid}.
  await tryDelete('favorites', async () => {
    await deleteCollection(collection(firestore, 'users', uid, 'favorites'));
  });
  await tryDelete('settings', async () => {
    await deleteCollection(collection(firestore, 'users', uid, 'settings'));
  });

  // 3. Delete the user profile document.
  await tryDelete('users/{uid}', () =>
    deleteDoc(doc(firestore, 'users', uid))
  );

  // 4. Best-effort: revoke the Google Sign-In native session so the next
  //    sign-in attempt re-prompts the account picker rather than silently
  //    using the previous Google identity.
  await tryDelete('google.signOut', async () => {
    let GoogleSignin;
    try {
      GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    } catch {}
    if (GoogleSignin && typeof GoogleSignin.signOut === 'function') {
      try {
        // revokeAccess fully releases the OAuth grant; signOut just
        // clears local state. We want both — but revokeAccess can throw
        // if the user never signed in with Google.
        if (typeof GoogleSignin.revokeAccess === 'function') {
          try { await GoogleSignin.revokeAccess(); } catch {}
        }
        await GoogleSignin.signOut();
      } catch (e) {
        console.warn('deleteAccount: GoogleSignin.signOut failed', e?.message);
      }
    }
  });

  // 5. Delete the Firebase Auth user. This will throw
  //    'auth/requires-recent-login' if the session is older than ~5
  //    minutes — the caller catches and prompts re-auth. Provider-
  //    agnostic: works for Email, Google, and Apple sign-ins.
  console.log('deleteAccount: deleting auth user');
  await currentUser.delete();
  console.log('deleteAccount: complete');
}
