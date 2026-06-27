'use strict';
/**
 * Source fetcher. Supports file / http(s) / inline, custom headers and query
 * params, ${ENV} interpolation (for API keys), gzip, and redirects. Returns the
 * raw payload string for the adapters to parse.
 *
 * Keeping fetch here (not in the engine) is what makes sources pluggable: a new
 * source is just config + (optionally) a connector hook — the engine is untouched.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

/** Replace ${VAR} with process.env.VAR (used for API keys in url/headers). */
function interpolateEnv(value) {
  if (typeof value === 'string') return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, k) => process.env[k] || '');
  if (Array.isArray(value)) return value.map(interpolateEnv);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolateEnv(v);
    return out;
  }
  return value;
}

function buildUrl(url, query) {
  if (!query) return url;
  const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return url + (url.includes('?') ? '&' : '?') + qs;
}

function httpGet(url, headers, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'SabalistIngestion/0.1 (+https://sabalist.com)', 'Accept-Encoding': 'gzip,deflate', Accept: '*/*', ...headers },
      timeout: 30000,
    }, (res) => {
      // redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(httpGet(next, headers, redirectsLeft - 1));
      }
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      const chunks = [];
      let stream = res;
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`timeout for ${url}`)));
    req.on('error', reject);
  });
}

/** Fetch a source's payload per its `fetch` config. baseDir for file:// paths. */
async function fetchPayload(source, baseDir = process.cwd()) {
  const f = interpolateEnv(source.fetch || {});
  switch (f.type) {
    case 'file':
      return fs.readFileSync(path.resolve(baseDir, f.path), 'utf8');
    case 'inline':
      return typeof f.payload === 'string' ? f.payload : JSON.stringify(f.payload);
    case 'http':
    case 'url':
      return httpGet(buildUrl(f.url, f.query), f.headers || {});
    default:
      throw new Error(`Unsupported fetch.type: ${f.type}`);
  }
}

module.exports = { fetchPayload, httpGet, interpolateEnv, buildUrl };
