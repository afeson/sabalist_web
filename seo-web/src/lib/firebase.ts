// Read-only Firebase client for SSR/ISR. The `listings` collection is
// world-readable (firestore.rules), so the public EXPO_PUBLIC_FIREBASE_* config
// is sufficient — no service account needed. Initialized once per server
// instance and reused across requests.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase sends the App ID as the `x-firebase-gmpid` gRPC/HTTP header on every
// Firestore request. HTTP headers can't contain newlines, so a trailing \n/\r on
// any of these values (env vars set via PowerShell `|` pick one up) throws
// "Metadata string value ... contains illegal characters" during SSG. Trim all.
const env = (v?: string) => (v == null ? v : v.trim());
const config = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: env(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  appId: env(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
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
