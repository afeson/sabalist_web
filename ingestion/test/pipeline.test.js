'use strict';
/**
 * Minimal pipeline test (no deps, no Firebase). Run: `node test/pipeline.test.js`
 * Exits non-zero on failure so it can gate CI / a Vercel build.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('../adapters');
const { runBatch, processRecord } = require('../lib/pipeline');
const { createMemoryStore } = require('../lib/storeMemory');
const { categorize } = require('../lib/taxonomy');
const { enrichGeo } = require('../lib/geo');

let failures = 0;
function assert(cond, msg) { if (!cond) { console.error('  ✗', msg); failures++; } else console.log('  ✓', msg); }

(async () => {
  console.log('taxonomy:');
  assert(categorize({ title: 'Toyota Corolla 2015', description: 'low mileage car' }).categoryId === 'vehicles', 'car → vehicles');
  assert(categorize({ rawCategory: 'property' }).categoryId === 'real-estate', 'alias property → real-estate');
  assert(categorize({ title: 'Friesian dairy cow', description: 'livestock' }).categoryId === 'animals-pets', 'cow → animals-pets');

  console.log('geo:');
  const g = enrichGeo({ location: 'Lekki, Lagos', country: 'Nigeria', amount: 100 });
  assert(g.countryCode === 'NG' && g.currency === 'NGN' && g.city === 'Lagos', 'Lagos → NG/NGN');

  console.log('pipeline (sample CSV):');
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../sources/sample-csv.json'), 'utf8'));
  const csv = fs.readFileSync(path.join(__dirname, '../sample-data/listings.csv'), 'utf8');
  const records = parse('csv', csv);
  const store = createMemoryStore();
  const stats = await runBatch(records, source, store, {});
  assert(stats.total === 7, 'parsed 7 records');
  assert(stats.published >= 3, `auto-published good listings (got ${stats.published})`);
  assert(stats.rejected >= 1 && store.rejected.some((r) => r.reason === 'spam'), 'spam rejected');
  assert(store.staging.some((r) => r.reason && r.reason.startsWith('duplicate')), 'near-duplicate sent to review');

  console.log('spam guard:');
  const spam = await processRecord({ title: 'FREE MONEY click here', details: 'guaranteed income' }, source, store);
  assert(spam.decision === 'reject', 'explicit spam → reject');

  if (failures) { console.error(`\n${failures} assertion(s) failed`); process.exit(1); }
  console.log('\nAll ingestion tests passed.');
})();
