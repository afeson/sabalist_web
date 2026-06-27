'use strict';
/**
 * Read-only credential check: init firebase-admin and read a single doc.
 * Proves the service account connects to Firestore WITHOUT writing anything.
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json node verify-creds.js
 */
(async () => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      : admin.credential.applicationDefault();
    admin.initializeApp({ credential: cred });
  }
  const db = admin.firestore();
  const proj = (admin.app().options.credential && admin.app().options.projectId) || process.env.GOOGLE_CLOUD_PROJECT || '(from key)';
  const snap = await db.collection('listings').limit(1).get();
  console.log(`OK — connected to Firestore. listings sample read: ${snap.size} doc(s).`);
  const staging = await db.collection('listings_staging').limit(1).get();
  console.log(`listings_staging readable: ${staging.size} doc(s) (admin SDK bypasses rules).`);
  process.exit(0);
})().catch((e) => { console.error('CREDENTIAL CHECK FAILED:', e.message); process.exit(1); });
