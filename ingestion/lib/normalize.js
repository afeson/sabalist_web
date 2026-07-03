'use strict';
/**
 * Dedup v2 field derivations (Phase 3). Pure, dependency-light helpers used both
 * to stamp listing docs at write time and to compare candidates in lib/match.js.
 *
 *   geohash6/7   coarse (~1.2km) + fine (~150m) blocking cells
 *   phoneE164    normalized phone (strong cross-source identity)
 *   domain       registrable website domain (strong identity)
 *   nameNorm     transliterated, suffix-stripped token set + a stable nameKey
 */
const crypto = require('crypto');
const geohash = require('ngeohash');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { transliterate } = require('transliteration');

const sha1 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

function geohashOf(lat, lon, precision) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return null;
  try { return geohash.encode(lat, lon, precision); } catch { return null; }
}
// The 8 neighbouring cells + self — used as blocking keys to avoid edge effects.
function geohashNeighbors(gh) {
  if (!gh) return [];
  try { return [gh, ...geohash.neighbors(gh)]; } catch { return [gh]; }
}

function phoneE164(phone, countryCode) {
  const raw = String(phone || '').trim();
  if (!raw) return null;
  try {
    const p = parsePhoneNumberFromString(raw, (countryCode || '').toUpperCase() || undefined);
    return p && p.isValid() ? p.number : null;
  } catch { return null; }
}

// Registrable domain (eTLD+1). Covers common two-label public suffixes incl. African.
const TWO_LABEL_TLDS = new Set([
  'co.uk', 'co.za', 'co.ke', 'co.tz', 'co.ug', 'co.zm', 'co.zw', 'co.mz', 'co.ls', 'co.bw',
  'com.ng', 'com.gh', 'com.eg', 'com.dz', 'org.za', 'gov.za', 'ac.za', 'or.ke', 'go.ke',
  'com.tn', 'com.ly', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au',
]);
function domainOf(url) {
  let host = String(url || '').trim().toLowerCase();
  if (!host) return null;
  host = host.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0];
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return null;
  const lastTwo = labels.slice(-2).join('.');
  const lastThree = labels.slice(-3).join('.');
  if (labels.length >= 3 && TWO_LABEL_TLDS.has(lastTwo)) return lastThree; // eTLD+1 for co.uk etc.
  return lastTwo;
}

// Legal suffixes, articles and generic business-type words stripped so name
// VARIANTS collapse ("Mama Cass" ≈ "Mama Cass Restaurant"). Category conflicts are
// handled separately in match.js, so stripping type words is safe.
const STOP = new Set([
  'ltd', 'plc', 'inc', 'llc', 'sarl', 'sa', 'gmbh', 'co', 'cie', 'ets', 'limited', 'company',
  'bv', 'nv', 'pty', 'the', 'le', 'la', 'les', 'el', 'al', 'los', 'las', 'and', 'de', 'du', 'des',
  'restaurant', 'restaurants', 'hotel', 'hotels', 'motel', 'lodge', 'guesthouse', 'guest', 'house',
  'pharmacy', 'pharmacie', 'cafe', 'coffee', 'bar', 'shop', 'store', 'stores', 'supermarket',
  'market', 'boutique', 'salon', 'clinic', 'hospital', 'school', 'college', 'academy', 'centre',
  'center', 'services', 'service', 'bank', 'office', 'ltd.',
]);

function nameNorm(name) {
  const ascii = transliterate(String(name || ''));
  const tokens = ascii.toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
  const uniq = [...new Set(tokens)].sort();
  const norm = uniq.join(' ');
  return { tokens: uniq, norm, key: uniq.length ? sha1(norm) : '' };
}

module.exports = { geohashOf, geohashNeighbors, phoneE164, domainOf, nameNorm, sha1 };
