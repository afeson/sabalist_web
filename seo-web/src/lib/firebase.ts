// Read-only Firebase client for SSR/ISR. The `listings` collection is
// world-readable (firestore.rules), so the public EXPO_PUBLIC_FIREBASE_* config
// is sufficient — no service account needed. Initialized once per server
// instance and reused across requests.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

export function db(): Firestore {
  if (!config.apiKey || !config.projectId) {
    throw new Error('Missing EXPO_PUBLIC_FIREBASE_* env. Copy .env.example → .env.local');
  }
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  if (!dbInstance) dbInstance = getFirestore(app);
  return dbInstance;
}
