'use strict';
/**
 * Firestore store (firebase-admin) implementing the pipeline's store interface.
 *
 * Requires a service account. Provide ONE of:
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json   (recommended)
 *   - FIREBASE_SERVICE_ACCOUNT='<json string>'
 *
 * Collections:
 *   listings           live marketplace (same collection the app reads)
 *   listings_staging   review queue (conflicts / dups / low quality)
 *   import_failures    rejected/errored records (audit)
 *   ingestion_stats    per-run aggregates (dashboard)
 *
 * NOTE on dedup at scale: findCandidates queries by indexed fields
 * (sourceKey, fingerprint). Create composite/single-field indexes for
 * `sourceKey`, `fingerprint`, and `categoryId` on both `listings` and
 * `listings_staging`. Avoid scanning by title at scale.
 */
function createFirestoreStore() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      credential = admin.credential.applicationDefault(); // uses GOOGLE_APPLICATION_CREDENTIALS
    }
    admin.initializeApp({ credential });
  }
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const LIVE = db.collection('listings');
  const STAGING = db.collection('listings_staging');
  const FAILED = db.collection('import_failures');

  return {
    async findCandidates({ sourceKey, fingerprint }) {
      const out = new Map();
      // Identity match (re-sync) — cheap, indexed.
      if (sourceKey) {
        const s = await LIVE.where('sourceKey', '==', sourceKey).limit(1).get();
        s.forEach((d) => out.set(d.id, { id: d.id, ...d.data() }));
      }
      // Fingerprint match (cross-source dup) — indexed, capped.
      if (fingerprint) {
        const f = await LIVE.where('fingerprint', '==', fingerprint).limit(10).get();
        f.forEach((d) => out.set(d.id, { id: d.id, ...d.data() }));
      }
      return [...out.values()];
    },
    async publish(listing) {
      // IMPORTANT: existing app listings store createdAt/updatedAt as ISO STRINGS.
      // Firestore orders strings after timestamps, so writing serverTimestamp()
      // here makes imports sort BELOW all organic listings (invisible on the
      // newest-first home feed). Match the app: ISO strings.
      const now = new Date().toISOString();
      const ref = await LIVE.add({
        ...listing,
        createdAt: listing.importedAt || now,
        updatedAt: listing.updatedAt || now,
      });
      return ref.id;
    },
    async update(id, listing) {
      await LIVE.doc(id).set({ ...listing, updatedAt: new Date().toISOString() }, { merge: true });
    },
    async enqueueReview(item) {
      const ref = await STAGING.add({
        listing: item.listing || null,
        reason: item.reason,
        similarity: item.similarity || null,
        matchId: item.matchId || null,
        confidence: item.confidence || null,
        quality: item.quality || null,
        source: item.meta ? item.meta.sourceId : null,
        sourceKey: item.meta ? item.meta.sourceKey : null,
        fingerprint: item.meta ? item.meta.fingerprint : null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
    async reject(item) {
      await FAILED.add({
        raw: item.raw || null,
        reason: item.reason || null,
        error: item.error || null,
        source: item.sourceId || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    },
    // Helpers used by the worker (not required by the pipeline).
    async recordRun(sourceId, stats) {
      await db.collection('ingestion_stats').add({ sourceId, ...stats, at: FieldValue.serverTimestamp() });
    },
    /** Expire live listings from a source not seen since `cutoffIso`. */
    async expireStale(sourceId, cutoffIso) {
      // updatedAt is an ISO string (see publish/update) — compare as string.
      const snap = await LIVE.where('source', '==', sourceId).where('updatedAt', '<', cutoffIso).get();
      const batch = db.batch();
      snap.forEach((d) => batch.update(d.ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() }));
      if (!snap.empty) await batch.commit();
      return snap.size;
    },
  };
}
module.exports = { createFirestoreStore };
