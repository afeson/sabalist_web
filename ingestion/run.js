#!/usr/bin/env node
'use strict';
/**
 * Ingestion CLI.
 *
 *   node run.js --source sources/sample-csv.json --dry      # in-memory, no creds
 *   node run.js --source sources/sample-csv.json            # writes to Firestore
 *
 * --dry runs the full pipeline against an in-memory store and prints what WOULD
 * happen (decisions, stats, queue). Without --dry it writes to Firestore via
 * firebase-admin (requires a service account — see README).
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('./adapters');
const { runBatch } = require('./lib/pipeline');
const { createMemoryStore } = require('./lib/storeMemory');
const { fetchPayload } = require('./lib/fetcher');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

async function main() {
  const dry = !!arg('dry', false);
  const sourcePath = arg('source');
  if (!sourcePath) { console.error('Usage: node run.js --source <config.json> [--dry]'); process.exit(2); }

  const baseDir = __dirname;
  const source = JSON.parse(fs.readFileSync(path.resolve(baseDir, sourcePath), 'utf8'));
  if (source.enabled === false) { console.log(`Source ${source.id} is disabled; skipping.`); return; }

  console.log(`\n▶ Ingesting source "${source.id}" (${source.format}) ${dry ? '[DRY RUN]' : '[LIVE → Firestore]'}`);
  const payload = await fetchPayload(source, baseDir);
  const records = parse(source.format, payload, source.parseOptions || {});
  console.log(`  parsed ${records.length} raw records`);

  let store;
  if (dry) store = createMemoryStore();
  else store = require('./lib/firestore').createFirestoreStore();

  const t0 = Date.now();
  const stats = await runBatch(records, source, store, {});
  const ms = Date.now() - t0;

  console.log(`\n─ Results (${ms}ms) ─────────────────────────────`);
  console.log(`  published: ${stats.published}   updated: ${stats.updated}   review: ${stats.review}   rejected: ${stats.rejected}`);
  console.log(`  by reason:`, stats.byReason);

  if (dry) {
    console.log(`\n  PUBLISHED (${store.live.length}):`);
    for (const l of store.live) console.log(`    • [${l.categoryId}/${l.subcategory || '-'}] ${l.title} — ${l.currency} ${l.amount} @ ${l.city || l.country || '?'} (q=${l.qualityScore})`);
    console.log(`\n  REVIEW QUEUE (${store.staging.length}):`);
    for (const r of store.staging) console.log(`    • ${r.reason}${r.similarity ? ` (sim ${r.similarity.toFixed(2)})` : ''}: ${r.listing ? r.listing.title : '(n/a)'}`);
    console.log(`\n  REJECTED (${store.rejected.length}):`);
    for (const r of store.rejected) console.log(`    • ${r.reason || r.error}: ${(r.raw && (r.raw.title || r.raw.ext_id)) || ''}`);
  }
  console.log('');
}

main().catch((e) => { console.error('ingest failed:', e); process.exit(1); });
