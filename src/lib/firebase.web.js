// Firebase Web SDK for web platform
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);

// Initialize Firestore with memory cache (simpler and more reliable than persistent)
let firestore;
try {
  // Use getFirestore() which uses memory cache by default - more reliable than persistent cache
  firestore = getFirestore(app);
  console.log('🔥 Firestore initialized with default memory cache');
} catch (error) {
  console.error('🔥 Firestore initialization error:', error.message);
  throw error;
}

const storage = getStorage(app);

console.log('🔥 Firebase Web SDK initialized:', {
  hasApp: !!app,
  hasAuth: !!auth,
  hasFirestore: !!firestore,
  hasStorage: !!storage,
  hasConfig: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  firestoreType: typeof firestore,
  firestoreName: firestore?.constructor?.name,
});

export { auth, firestore, storage };
