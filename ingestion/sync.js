#!/usr/bin/env node
'use strict';
/**
 * Continuous sync orchestrator — runs every enabled source through the engine.
 *
 *   node sync.js --dry                 # all enabled sources, in-memory (no creds)
 *   node sync.js                       # all enabled sources -> Firestore
 *   node sync.js --source remotive-jobs
 *   node sync.js --expire              # also mark stale listings expired (live)
 *
 * Intended to be invoked on a schedule (GitHub Actions cron / any cron / a
 * node-cron daemon) — see README "Going live". Per-source cadence lives in each
 * source's `schedule` (cron) field; the external scheduler controls how often
 * this command runs.
 */
const { listSources, getSource } = require('./lib/registry');
const { ingestSource } = require('./lib/ingestSource');
const { createMemoryStore } = require('./lib/storeMemory');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

async function main() {
  const dry = !!arg('dry', false);
  const only = arg('source', null);
  const doExpire = !!arg('expire', false);
  const limit = arg('limit', null);

  const sources = only ? [getSource(only)].filter(Boolean) : listSources();
  if (!sources.length) { console.error('No enabled sources found.'); process.exit(1); }

  const store = dry ? createMemoryStore() : require('./lib/firestore').createFirestoreStore();
  console.log(`\n🌍 Sabalist sync — ${sources.length} source(s) ${dry ? '[DRY]' : '[LIVE → Firestore]'} @ ${new Date().toISOString()}`);

  const totals = { published: 0, updated: 0, review: 0, rejected: 0, total: 0 };
  for (const source of sources) {
    process.stdout.write(`\n• ${source.id} (${source.region || '—'}) … `);
    try {
      const opts = { now: new Date().toISOString() };
      if (limit) opts.limit = Number(limit);
      const stats = await ingestSource(source, store, opts);
      for (const k of Object.keys(totals)) totals[k] += stats[k] || 0;
      console.log(`pub ${stats.published} | upd ${stats.updated} | review ${stats.review} | rej ${stats.rejected} (of ${stats.total})`);
      if (!dry) {
        if (store.recordRun) await store.recordRun(source.id, stats);
        if (doExpire && store.expireStale) {
          const days = (source.thresholds && source.thresholds.expireAfterDays) || 90;
          const cutoff = new Date(Date.now() - days * 86400000).toISOString();
          const n = await store.expireStale(source.id, cutoff);
          if (n) console.log(`    expired ${n} stale listing(s)`);
        }
      }
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      if (!dry && store.reject) await store.reject({ sourceId: source.id, error: `source_fetch: ${e.message}` });
    }
  }

  console.log(`\n─ TOTAL ─ published ${totals.published} | updated ${totals.updated} | review ${totals.review} | rejected ${totals.rejected} | seen ${totals.total}\n`);
}

main().catch((e) => { console.error('sync failed:', e); process.exit(1); });
