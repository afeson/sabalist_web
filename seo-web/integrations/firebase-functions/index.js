/**
 * Firestore → Next.js revalidation bridge.
 *
 * Fires whenever a document in `listings/{id}` is created, updated, or deleted,
 * and POSTs to the seo-web /api/revalidate webhook so the affected listing,
 * category, and location pages refresh immediately (instead of waiting for ISR).
 *
 * Deploy as a Firebase Cloud Function (2nd gen). Requires two config values:
 *   SEO_REVALIDATE_URL    e.g. https://www.sabalist.com/api/revalidate
 *   SEO_REVALIDATE_SECRET must match REVALIDATE_SECRET in the Vercel project
 *
 * Set them with:
 *   firebase functions:secrets:set SEO_REVALIDATE_SECRET
 *   (and put SEO_REVALIDATE_URL in functions env / .env)
 */
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');

const REVALIDATE_SECRET = defineSecret('SEO_REVALIDATE_SECRET');

exports.revalidateOnListingWrite = onDocumentWritten(
  { document: 'listings/{id}', secrets: [REVALIDATE_SECRET], region: 'us-central1' },
  async (event) => {
    const url = process.env.SEO_REVALIDATE_URL; // e.g. https://www.sabalist.com/api/revalidate
    if (!url) { console.warn('SEO_REVALIDATE_URL not set; skipping'); return; }

    const after = event.data?.after?.data();
    const before = event.data?.before?.data();
    const doc = after || before || {};
    const id = event.params.id;

    // Prefer the slug; fall back to display key matching the app's data model.
    const categoryId = doc.categoryId || doc.category || undefined;
    const payload = {
      type: 'listing',
      id,
      categoryId,
      subcategory: doc.subcategory || undefined,
      location: doc.location || undefined,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': REVALIDATE_SECRET.value() },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      console.log(`[revalidate] ${id} -> ${res.status}`, json.revalidated || json);
    } catch (e) {
      console.error('[revalidate] failed', e);
    }
  },
);
