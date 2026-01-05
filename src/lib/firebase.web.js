// Firebase Web SDK for web platform
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
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

// CRITICAL: Set auth persistence to LOCAL (survives browser refresh)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('🔥 Auth persistence set to LOCAL (survives refresh)');
  })
  .catch((error) => {
    console.error('❌ Failed to set auth persistence:', error);
  });

// CRITICAL: Force Firestore to use REST API instead of WebSocket/gRPC streaming
// WebSocket connections may be blocked on Vercel or fail to establish
let firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,  // Force long-polling (REST) instead of WebSocket
    experimentalAutoDetectLongPolling: false, // Disable auto-detect, always use long-polling
  });
  console.log('🔥 Firestore initialized with FORCED LONG-POLLING (REST mode)');
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
