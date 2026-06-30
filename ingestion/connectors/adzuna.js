'use strict';
/**
 * Adzuna jobs connector — REAL job postings with apply links. Adds South Africa
 * (the only African country Adzuna covers) plus optional diaspora markets. Each
 * listing has a real redirect/apply URL (contact path).
 *
 * ACTIVATION: set env ADZUNA_APP_ID + ADZUNA_APP_KEY (free —
 * https://developer.adzuna.com/). Optional ADZUNA_COUNTRIES (csv, default "za").
 * No keys -> safe no-op.
 */
const https = require('https');
function getJSON(url) {
  return new Promise((resolve, reject) => {
    const r = https.get(url, (res) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch (e) { reject(e); } }); });
    r.on('error', reject); r.setTimeout(30000, () => r.destroy(new Error('timeout')));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

module.exports = {
  source: {
    id: 'adzuna-jobs',
    name: 'Adzuna — real job postings with apply links (South Africa + diaspora)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license: 'Adzuna API (official) — real job listings; contact = apply URL.',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.6 },
    mapping: {
      externalId: 'externalId', title: 'title', description: 'description',
      category: { const: 'jobs' }, location: 'location', country: 'country',
      url: 'url', priceType: { const: 'none' },
    },
    async load() {
      const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
      if (!id || !key) { console.log('  (adzuna-jobs skipped — set ADZUNA_APP_ID + ADZUNA_APP_KEY to activate)'); return []; }
      const countries = (process.env.ADZUNA_COUNTRIES || 'za').split(',').map((s) => s.trim()).filter(Boolean);
      const out = [];
      for (const cc of countries) {
        for (let page = 1; page <= 5; page++) {
          try {
            const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}?app_id=${id}&app_key=${key}&results_per_page=50&content-type=application/json`;
            const data = await getJSON(url);
            const results = (data && data.results) || [];
            if (!results.length) break;
            for (const j of results) {
              if (!j.title || !j.redirect_url) continue;
              const company = j.company && j.company.display_name;
              const loc = j.location && j.location.display_name;
              out.push({
                externalId: `adzuna-${cc}-${j.id}`,
                title: String(j.title).slice(0, 120),
                description: (strip(j.description) || j.title).slice(0, 600) + (company ? ` — ${company}` : '') + '. Apply via the listing link.',
                location: loc || cc.toUpperCase(),
                country: cc === 'za' ? 'South Africa' : cc.toUpperCase(),
                url: j.redirect_url,
              });
            }
          } catch (e) { break; }
          await sleep(350);
        }
      }
      return out;
    },
  },
};
