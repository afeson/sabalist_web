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

/**
 * Read the backend-driven ingestion config (marketplace_config/live .ingestion).
 * Admin must already be initialized (createFirestoreStore does this). Returns
 * null on any failure so the caller falls back to bundled source flags.
 */
async function getIngestionConfig() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) return null;
    const snap = await admin.firestore().collection('marketplace_config').doc('live').get();
    return snap.exists ? (snap.data().ingestion || null) : null;
  } catch (e) { return null; }
}

/** Apply remote ingestion config: drop disabled sources, order by priority, cap. */
function applyIngestionConfig(sources, cfg) {
  if (!cfg) return sources;
  const disabled = new Set(Array.isArray(cfg.disabledSources) ? cfg.disabledSources : []);
  const prio = (cfg.sourcePriorities && typeof cfg.sourcePriorities === 'object') ? cfg.sourcePriorities : {};
  let out = sources.filter((s) => !disabled.has(s.id));
  // Higher priority first; unlisted sources keep priority 0 (stable order).
  out = out.map((s, i) => ({ s, i }))
    .sort((a, b) => (Number(prio[b.s.id] || 0) - Number(prio[a.s.id] || 0)) || (a.i - b.i))
    .map((x) => x.s);
  if (Number.isFinite(Number(cfg.maxPerRun)) && Number(cfg.maxPerRun) > 0) {
    out = out.slice(0, Number(cfg.maxPerRun));
  }
  return out;
}

async function main() {
  const dry = !!arg('dry', false);
  const only = arg('source', null);
  const doExpire = !!arg('expire', false);
  const limit = arg('limit', null);

  let sources = only ? [getSource(only)].filter(Boolean) : listSources();
  if (!sources.length) { console.error('No enabled sources found.'); process.exit(1); }

  const store = dry ? createMemoryStore() : require('./lib/firestore').createFirestoreStore();

  // Backend-driven ingestion config (priorities / disabled / cap). Live runs
  // only; a specific --source run is left as-is. Falls back to bundled flags.
  if (!dry && !only) {
    const ingestionCfg = await getIngestionConfig();
    if (ingestionCfg) {
      const before = sources.length;
      sources = applyIngestionConfig(sources, ingestionCfg);
      console.log(`⚙️  ingestion config applied: ${before} → ${sources.length} source(s) (priority-ordered)`);
    }
  }

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
