'use strict';
/**
 * Source adapters: turn a raw payload (string/buffer) from any feed format into
 * an array of plain JS records the mapping engine can consume.
 *
 * Dependency-free so the pipeline runs out of the box. For very large/complex
 * XML at scale, swap parseXml for `fast-xml-parser` (noted in README) — the
 * interface (returns record[]) stays the same.
 */

// ---- CSV (RFC-4180-ish: quotes, escaped quotes, embedded commas/newlines) ----
function parseCsv(text, { delimiter = ',' } = {}) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c !== '')).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i] != null ? r[i] : ''; });
    return obj;
  });
}

// ---- JSON (optionally drill into an array at `recordsPath`) ----
function parseJson(text, { recordsPath = '' } = {}) {
  const data = typeof text === 'string' ? JSON.parse(text) : text;
  let arr = data;
  if (recordsPath) arr = recordsPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
  if (Array.isArray(arr)) return arr;
  if (arr && typeof arr === 'object') return [arr];
  return [];
}

// ---- XML / RSS (lightweight; extracts repeated <item>/<entry>/itemTag) ----
function parseXml(text, { itemTag = 'item' } = {}) {
  const s = String(text);
  const re = new RegExp(`<${itemTag}[\\s>][\\s\\S]*?<\\/${itemTag}>`, 'gi');
  const blocks = s.match(re) || [];
  return blocks.map((block) => {
    const rec = {};
    const fieldRe = /<([a-zA-Z0-9:_-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = fieldRe.exec(block)) !== null) {
      const key = m[1].replace(/^.*:/, ''); // drop namespace prefix
      let val = m[2].trim();
      const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
      if (cdata) val = cdata[1].trim();
      // first occurrence wins; collect media urls into images
      if (key === 'enclosure' || /image|thumbnail|media/i.test(key)) {
        const url = (block.match(/url="([^"]+)"/) || [])[1];
        if (url) (rec.images = rec.images || []).push(url);
      }
      if (!(key in rec)) rec[key] = val;
    }
    return rec;
  });
}

const FORMATS = { csv: parseCsv, json: parseJson, xml: parseXml, rss: parseXml };

/** Parse a payload for a given source format. */
function parse(format, payload, options = {}) {
  const fn = FORMATS[String(format || '').toLowerCase()];
  if (!fn) throw new Error(`Unsupported source format: ${format}`);
  return fn(payload, options);
}

module.exports = { parse, parseCsv, parseJson, parseXml, FORMATS };
