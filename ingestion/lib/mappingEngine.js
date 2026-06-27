'use strict';
/**
 * Universal mapping engine.
 *
 * A source declares a `mapping` config (field -> source path | rule). This
 * converts an arbitrary raw record into a normalized Sabalist listing draft.
 * Field rules support:
 *   - "a.b.c"                    dotted path lookup
 *   - ["a", "b"]                 first non-empty of several paths
 *   - { path, transform, default, const }
 *
 * Built-in transforms keep most source configs to plain JSON (no code needed).
 */

const TRANSFORMS = {
  trim: (v) => (v == null ? v : String(v).trim()),
  lower: (v) => (v == null ? v : String(v).toLowerCase()),
  upper: (v) => (v == null ? v : String(v).toUpperCase()),
  number: (v) => {
    if (v == null) return null;
    const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  },
  // "₦1,250,000" / "USD 3000" -> 1250000
  priceAmount: (v) => {
    if (v == null) return null;
    const m = String(v).replace(/[, ]/g, '').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  },
  splitImages: (v) => {
    if (Array.isArray(v)) return v.filter(Boolean);
    if (!v) return [];
    return String(v).split(/[|,;\n]+/).map((s) => s.trim()).filter(Boolean);
  },
  stripHtml: (v) => (v == null ? v : String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
  isoDate: (v) => {
    if (!v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  },
};

function getPath(obj, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function resolveField(raw, rule) {
  if (rule == null) return undefined;
  // Plain string path.
  if (typeof rule === 'string') return getPath(raw, rule);
  // Array of fallback paths.
  if (Array.isArray(rule)) {
    for (const p of rule) {
      const v = getPath(raw, p);
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }
  // Object rule.
  if (typeof rule === 'object') {
    if ('const' in rule) return rule.const;
    let v = rule.path ? resolveField(raw, rule.path) : undefined;
    if ((v === undefined || v === null || v === '') && 'default' in rule) v = rule.default;
    if (rule.transform) {
      const fns = Array.isArray(rule.transform) ? rule.transform : [rule.transform];
      for (const t of fns) {
        const fn = TRANSFORMS[t];
        if (!fn) throw new Error(`Unknown transform: ${t}`);
        v = fn(v);
      }
    }
    return v;
  }
  return undefined;
}

/**
 * Map a raw record into a Sabalist listing draft using the source's mapping.
 * Returns a partial listing; geo/category/quality are filled by the pipeline.
 */
function mapRecord(raw, mapping = {}) {
  const draft = {};
  for (const [field, rule] of Object.entries(mapping)) {
    const v = resolveField(raw, rule);
    if (v !== undefined) draft[field] = v;
  }
  // Normalize the price shape the app expects.
  if (draft.amount == null && draft.price != null) draft.amount = TRANSFORMS.priceAmount(draft.price);
  if (!Array.isArray(draft.images)) draft.images = TRANSFORMS.splitImages(draft.images);
  draft.coverImage = draft.coverImage || draft.images[0] || '';
  return draft;
}

module.exports = { mapRecord, resolveField, getPath, TRANSFORMS };
