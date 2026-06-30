'use strict';
/**
 * ReliefWeb jobs connector (CODE connector, load() hook).
 *
 * Source: ReliefWeb (UN OCHA) public API — free, no key. The strongest free
 * source of REAL humanitarian / development / NGO jobs across Africa. Every
 * posting carries an apply page URL (the `url` field), which is the contact
 * path a candidate follows — so the "every listing must be reachable" rule is
 * always satisfied.
 *
 * Maps to the Jobs category; subcategory is derived from the posting `type`
 * (internships / part-time / freelance/contract / remote, default full-time).
 * Location/country comes from the posting's `country` field; we keep African
 * postings first (the API returns global humanitarian roles, heavily African).
 *
 * Endpoint (GET, appname required):
 *   https://api.reliefweb.int/v2/jobs?appname=<APP>&limit=100&offset=N
 *   &fields[include][]=title&...&how_to_apply&url&country&source&type&
 *   date.created&career_categories
 *
 * ACTIVATION: as of 1 Nov 2025 ReliefWeb requires a PRE-APPROVED appname
 * (request one at https://apidoc.reliefweb.int/parameters#appname — a short form,
 * approved by email). Unapproved appnames get HTTP 403 on every request. Set env
 * RELIEFWEB_APPNAME to the approved value to activate; without it the connector
 * is a safe no-op (no fake data). The default 'sabalist.com' is NOT yet approved.
 */
const { VALID_SUBS } = require('../lib/taxonomy');

const BASE = 'https://api.reliefweb.int/v2/jobs';
const APPNAME = process.env.RELIEFWEB_APPNAME || 'sabalist.com';
const PAGE_SIZE = 100;
const MAX_PAGES = 12; // up to ~1,200 postings per run
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// ReliefWeb job "type" / career text -> Sabalist jobs subcategory.
function subFor(typeText, careerText) {
  const t = `${typeText || ''} ${careerText || ''}`.toLowerCase();
  if (/intern/.test(t)) return 'internships';
  if (/part.?time/.test(t)) return 'part-time';
  if (/consultan|freelance|contract|short.?term|temporary/.test(t)) return 'freelance';
  if (/remote|home.?based|telecommut/.test(t)) return 'remote';
  return 'full-time';
}

// Build the query string. fields[include][] is repeated; appname is mandatory.
function buildUrl(offset) {
  const fields = ['title', 'how_to_apply', 'url', 'country', 'source', 'type', 'date.created', 'career_categories'];
  const qs = [
    `appname=${encodeURIComponent(APPNAME)}`,
    `limit=${PAGE_SIZE}`,
    `offset=${offset}`,
    'sort[]=date.created:desc',
    ...fields.map((f) => `fields[include][]=${encodeURIComponent(f)}`),
  ].join('&');
  return `${BASE}?${qs}`;
}

// Flatten ReliefWeb's value objects (each field is {name} or an array of them).
function names(field) {
  if (!field) return [];
  const arr = Array.isArray(field) ? field : [field];
  return arr.map((x) => (x && (x.name || x.value)) || '').filter(Boolean);
}

module.exports = {
  source: {
    id: 'reliefweb-jobs',
    name: 'ReliefWeb (UN OCHA) — humanitarian/NGO jobs (Africa-strong, free API)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'ReliefWeb (UN OCHA) public API — free, no key; contact = the job apply URL.',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.6 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: { const: 'jobs' }, subcategory: 'subcategory',
      location: 'location', country: 'country', url: 'url',
      postedAt: 'postedAt', priceType: { const: 'none' },
    },

    async load({ httpGet, opts }) {
      const out = [];
      const seen = new Set();
      const validJobSubs = VALID_SUBS.jobs;
      // ReliefWeb (since 1 Nov 2025) blocks unapproved appnames with HTTP 403.
      // Probe once; if the appname isn't approved, no-op (never fabricate jobs).
      try {
        await httpGet(buildUrl(0), { Accept: 'application/json', 'User-Agent': `Sabalist/1.0 (+https://${APPNAME})` });
      } catch (e) {
        if (/HTTP 403/.test(e.message)) {
          console.log(`  (reliefweb-jobs skipped — appname "${APPNAME}" not approved by ReliefWeb; set RELIEFWEB_APPNAME to an approved appname to activate. Request one at https://apidoc.reliefweb.int/parameters#appname)`);
          return [];
        }
        throw e;
      }
      for (let page = 0; page < MAX_PAGES; page++) {
        try {
          const raw = await httpGet(buildUrl(page * PAGE_SIZE), {
            Accept: 'application/json',
            'User-Agent': `Sabalist/1.0 (+https://${APPNAME})`,
          });
          const data = JSON.parse(raw).data || [];
          if (!data.length) break;
          for (const item of data) {
            const f = item.fields || {};
            const id = item.id || (f.url || '');
            const url = f.url || '';
            if (!url || !/^https?:\/\//.test(url)) continue; // apply page = contact path, required
            const key = String(id) || url;
            if (seen.has(key)) continue;
            seen.add(key);
            const title = strip(f.title);
            if (!title) continue;
            const countries = names(f.country);
            const country = countries[0] || '';
            const org = names(f.source)[0] || '';
            const type = names(f.type)[0] || '';
            const careers = names(f.career_categories).join(', ');
            const how = strip(f.how_to_apply);
            let sub = subFor(type, careers);
            if (!validJobSubs.has(sub)) sub = 'full-time';
            const desc = [
              `${title}${org ? ` — ${org}` : ''}${country ? ` (${country})` : ''}.`,
              careers ? `Category: ${careers}.` : '',
              how ? `How to apply: ${how}` : 'Apply via the listing link.',
              'Source: ReliefWeb (UN OCHA).',
            ].filter(Boolean).join(' ').slice(0, 700);
            out.push({
              externalId: `reliefweb-${id}`,
              title: title.slice(0, 140),
              subcategory: sub,
              description: desc,
              location: countries.join(', ') || country,
              country,
              url, // apply page — the contact path
              postedAt: (f.date && f.date.created) || '',
            });
          }
        } catch (e) {
          // per-page failure is non-fatal; stop paginating on hard errors
          if (page === 0) throw e;
          break;
        }
        await sleep(800); // be polite to the API
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
