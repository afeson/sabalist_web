'use strict';
/**
 * Wikidata events connector (CODE connector, load() hook).
 *
 * Fills the Events & Tickets category with REAL, recurring African events
 * (festivals, music/jazz festivals, film festivals, conferences, sporting
 * events, theatre/arts festivals) that each carry an official website (P856) —
 * a genuine contact path, satisfying the "every listing must be reachable" rule.
 *
 * Source: Wikidata Query Service (SPARQL). Data is CC0 (public domain); free and
 * legal to reuse. We only keep items that have an official website so there is a
 * real link a buyer can follow. Recurring annual festivals are evergreen, so
 * these listings stay relevant year-round (the listing is the event series, not
 * a single dated instance).
 *
 * Subcategory is derived from the Wikidata "instance of" (P31) type so events
 * spread across concerts / festivals / theater / conferences / sports-events.
 */
const SPARQL = 'https://query.wikidata.org/sparql';
const UA = 'Sabalist-data/1.0 (https://sabalist.com; afesonabebe@yahoo.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Top-level event classes to pull (Wikidata QIDs), each with the subclass walk.
// Kept narrow to event *series* that recur, not one-off dated happenings.
const CLASSES = [
  ['Q132241', 'festival'],          // festival (and subclasses: music/film/arts festivals)
  ['Q27968055', 'recurring event'], // recurring event
  ['Q2495862', 'music festival'],
  ['Q220505', 'film festival'],
  ['Q2624046', 'arts festival'],
  // --- expansion: more event classes to fill events-tickets subs ---
  ['Q868557', 'music festival'],         // music festival (alt class)
  ['Q18608583', 'recurring sporting event'], // -> sports-events
  ['Q2020153', 'academic conference'],   // -> conferences
  ['Q625994', 'conference'],             // conference -> conferences
];

// Map an event's lower-cased type/name text to an events-tickets subcategory.
function subFor(text) {
  const t = String(text || '').toLowerCase();
  if (/film|cinema|movie/.test(t)) return 'theater';            // film/arts festivals -> Theater & Arts
  if (/theatre|theater|drama|arts|poetry|dance|literary|book/.test(t)) return 'theater';
  if (/jazz|music|concert|gnaoua|sound|sonic/.test(t)) return 'concerts';
  if (/conference|summit|forum|symposium|expo|convention/.test(t)) return 'conferences';
  if (/sport|marathon|race|cup|championship|tournament|football|rally/.test(t)) return 'sports-events';
  if (/festival|carnival|fest\b|fiesta|celebration/.test(t)) return 'festivals';
  return 'festivals';
}

function buildQuery(classQid) {
  // African events of the given class that have an official website (P856) — the
  // required contact path. Also pull an image (P18) when present and start/point-
  // in-time dates (P580 / P585) so listings carry a photo and a date when known.
  return `SELECT DISTINCT ?item ?itemLabel ?typeLabel ?website ?countryLabel ?locLabel ?image ?start ?when WHERE {
  ?item wdt:P31/wdt:P279* wd:${classQid} .
  ?item wdt:P17 ?country .
  ?country wdt:P30 wd:Q15 .
  ?item wdt:P856 ?website .
  OPTIONAL { ?item wdt:P31 ?type . }
  OPTIONAL { ?item wdt:P276 ?loc . }
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item wdt:P580 ?start . }
  OPTIONAL { ?item wdt:P585 ?when . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,ar". }
}
LIMIT 600`;
}

module.exports = {
  source: {
    id: 'wikidata-events-africa',
    name: 'Wikidata — African events & festivals (SPARQL, CC0)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'Wikidata (CC0 1.0 public domain). Official website (P856) used as the contact path.',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: 'category', subcategory: 'subcategory',
      location: 'location', country: 'country', website: 'website', url: 'url',
      images: 'images', coverImage: 'coverImage', postedAt: 'postedAt',
      priceType: { const: 'none' },
    },

    async load({ httpRequest, opts }) {
      const out = [];
      const seen = new Set();
      for (const [qid, clsLabel] of CLASSES) {
        try {
          const body = `format=json&query=${encodeURIComponent(buildQuery(qid))}`;
          const raw = await httpRequest(SPARQL, {
            method: 'POST',
            headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const rows = ((JSON.parse(raw).results) || {}).bindings || [];
          for (const r of rows) {
            const qidUri = (r.item || {}).value || '';
            const id = qidUri.split('/').pop();
            if (!id || seen.has(id)) continue;
            seen.add(id);
            const name = (r.itemLabel || {}).value || '';
            if (!name || /^Q\d+$/.test(name)) continue; // skip unlabeled entities
            const website = (r.website || {}).value || '';
            if (!website) continue; // contact path required
            const country = (r.countryLabel || {}).value || '';
            const loc = (r.locLabel || {}).value || '';
            const type = (r.typeLabel || {}).value || clsLabel;
            const where = [loc, country].filter(Boolean).join(', ');
            const image = (r.image || {}).value || ''; // P18 -> Commons FilePath URL
            const when = (r.start || {}).value || (r.when || {}).value || ''; // P580 / P585
            out.push({
              externalId: `wikidata-${id}`,
              title: name,
              description: `${name} — ${type || 'event'} in ${where || 'Africa'}. Recurring event; details and tickets via the official website. Source: Wikidata (CC0).`,
              category: 'events-tickets',
              subcategory: subFor(`${type} ${name}`),
              location: where || country,
              country,
              website,
              url: qidUri || website,
              images: image ? [image] : [],
              coverImage: image || '',
              postedAt: when,
            });
          }
        } catch (e) {
          // per-class failure is non-fatal
        }
        await sleep(1200); // be polite to WDQS
        if (opts && opts.limit && out.length >= opts.limit * 5) break;
      }
      return out;
    },
  },
};
