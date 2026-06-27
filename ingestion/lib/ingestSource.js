'use strict';
/**
 * Ingest one source end-to-end: fetch -> parse -> pipeline -> store.
 * Shared by the single-source CLI (run.js) and the orchestrator (sync.js).
 */
const { fetchPayload } = require('./fetcher');
const { parse } = require('../adapters');
const { runBatch } = require('./pipeline');

async function ingestSource(source, store, opts = {}) {
  const baseDir = opts.baseDir || require('path').resolve(__dirname, '..');
  const startedAt = new Date().toISOString();
  const payload = await fetchPayload(source, baseDir);
  let records = parse(source.format, payload, source.parseOptions || {});

  // Optional connector-level transform hook (for sources that need custom prep).
  if (typeof source.transform === 'function') records = source.transform(records);
  if (opts.limit) records = records.slice(0, opts.limit);

  const stats = await runBatch(records, source, store, opts);
  stats.sourceId = source.id;
  stats.startedAt = startedAt;
  stats.finishedAt = new Date().toISOString();
  return stats;
}

module.exports = { ingestSource };
