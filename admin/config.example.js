// Copy to admin/config.js (gitignored) and fill in. The Firebase web config is
// the same public EXPO_PUBLIC_FIREBASE_* values the app already ships with.
window.SABALIST_ADMIN_CONFIG = {
  firebase: {
    apiKey: 'YOUR_EXPO_PUBLIC_FIREBASE_API_KEY',
    authDomain: 'sabalist.firebaseapp.com',
    projectId: 'sabalist',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    appId: 'YOUR_APP_ID',
  },
  // Only these signed-in emails may use the dashboard. Firestore rules MUST
  // enforce the same allowlist server-side (see ingestion/firestore-admin.rules).
  adminEmails: ['afesonabebe@yahoo.com'],
};
