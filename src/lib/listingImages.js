// Listing image normalization.
//
// Listings created by different versions of the app have stored their
// images under different field names. Some Android devices were rendering
// the placeholder because the card was only looking at `coverImage` /
// `images[0]` and missing legacy fields like `imageUrl`, `photos`,
// `media`, `thumbnail`. This helper collapses all those shapes into a
// single primary URL + an ordered list of all valid URLs.
//
// Returned shape:
//   { uri: string|null, all: string[] }
//
// `uri` is the first valid URL (cover image preferred, otherwise the
// first non-empty entry from the gallery fields). It is `null` only if
// no valid image URL exists — that is the *only* case in which the
// caller should fall back to the bundled placeholder asset.

const FIELDS_SINGLE = ['coverImage', 'image', 'imageUrl', 'photo', 'thumbnail'];
const FIELDS_ARRAY = ['images', 'photos', 'media'];

function isValidUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Accept absolute http(s) URLs (Firebase Storage URLs, CDN URLs) and
  // local content/file URIs that React Native's Image component can
  // resolve. Anything else (empty, "null", base64 placeholder fragments)
  // is treated as missing.
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:image/')
  );
}

function pushIfValid(out, value) {
  if (isValidUrl(value) && !out.includes(value)) {
    out.push(value);
  }
}

export function normalizeListingImages(listing) {
  if (!listing || typeof listing !== 'object') {
    return { uri: null, all: [] };
  }

  const all = [];

  // Single-URL fields first so coverImage / thumbnail can win as the
  // primary image when present.
  for (const field of FIELDS_SINGLE) {
    pushIfValid(all, listing[field]);
  }

  // Array fields (images[], photos[], media[]). Entries may be plain
  // strings or objects like { url } / { uri } / { src } — handle both.
  for (const field of FIELDS_ARRAY) {
    const arr = listing[field];
    if (!Array.isArray(arr)) continue;
    for (const entry of arr) {
      if (typeof entry === 'string') {
        pushIfValid(all, entry);
      } else if (entry && typeof entry === 'object') {
        pushIfValid(all, entry.url || entry.uri || entry.src || entry.downloadURL);
      }
    }
  }

  return { uri: all[0] || null, all };
}

// Append a cache-busting param so updated listings refresh their image
// on Android (RN Image aggressively caches Firebase Storage URLs even
// after the underlying object changes). Safe to call with null/empty.
export function withCacheBuster(uri, timestamp) {
  if (!uri || typeof uri !== 'string') return uri;
  if (!uri.startsWith('http')) return uri;
  if (!timestamp) return uri;
  const key =
    typeof timestamp === 'string'
      ? timestamp
      : timestamp?.toMillis?.() ?? timestamp;
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}v=${key}`;
}
