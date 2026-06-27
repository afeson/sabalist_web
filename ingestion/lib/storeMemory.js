'use strict';
/**
 * In-memory store for dry runs and unit tests. Implements the same interface
 * the pipeline expects from the Firestore store, so `--dry` exercises the full
 * pipeline (map/geo/categorize/dedup/quality/route) with zero credentials.
 */
function createMemoryStore() {
  const live = [];      // published listings
  const staging = [];   // review queue
  const rejected = [];
  let seq = 0;

  return {
    live, staging, rejected,
    async findCandidates({ sourceKey, fingerprint, categoryId }) {
      // Match anything already published with same identity, fingerprint or category.
      return live.filter((l) =>
        (sourceKey && l.sourceKey === sourceKey) ||
        (fingerprint && l.fingerprint === fingerprint) ||
        (categoryId && l.categoryId === categoryId)
      );
    },
    async publish(listing) { const id = `live_${++seq}`; live.push({ id, ...listing }); return id; },
    async update(id, listing) { const i = live.findIndex((l) => l.id === id); if (i >= 0) live[i] = { ...live[i], ...listing }; },
    async enqueueReview(item) { const id = `rev_${++seq}`; staging.push({ id, ...item }); return id; },
    async reject(item) { rejected.push(item); },
  };
}
module.exports = { createMemoryStore };
