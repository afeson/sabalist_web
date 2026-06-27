'use strict';
/**
 * Source registry. Discovers sources from two places so new sources can be
 * added WITHOUT touching the engine:
 *   1. sources/*.json   — declarative config connectors (most sources)
 *   2. connectors/*.js  — code connectors that export { source, transform? }
 *                         for feeds needing custom fetch/pagination/transform
 *
 * A code connector module shape:
 *   module.exports = {
 *     source: { id, name, format, fetch, mapping, schedule, ... },
 *     transform(records) { return records; }   // optional
 *   }
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadJsonSources() {
  const dir = path.join(ROOT, 'sources');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    cfg.__file = `sources/${f}`;
    return cfg;
  });
}

function loadCodeConnectors() {
  const dir = path.join(ROOT, 'connectors');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.js') && f !== 'index.js')
    .map((f) => {
      const mod = require(path.join(dir, f));
      const src = mod.source || mod;
      if (mod.transform) src.transform = mod.transform;
      src.__file = `connectors/${f}`;
      return src;
    });
}

function listSources({ includeDisabled = false } = {}) {
  const all = [...loadJsonSources(), ...loadCodeConnectors()];
  return includeDisabled ? all : all.filter((s) => s.enabled !== false);
}

function getSource(id) {
  return listSources({ includeDisabled: true }).find((s) => s.id === id) || null;
}

module.exports = { listSources, getSource, ROOT };
