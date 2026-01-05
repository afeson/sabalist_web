// Firebase Web SDK for web platform
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Initialize Firestore with settings for better web compatibility
// Using persistent cache can help with connection stability
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log('🔥 Firestore initialized with persistent cache');
} catch (error) {
  // If already initialized or persistent cache fails, fall back to default
  console.log('🔥 Firestore already initialized or using default cache:', error.message);
  firestore = getFirestore(app);
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
