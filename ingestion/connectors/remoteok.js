'use strict';
/**
 * RemoteOK connector (CODE connector — demonstrates the connectors/*.js path).
 *
 * RemoteOK's public API returns a JSON array whose FIRST element is a legal/
 * attribution notice rather than a job, so we slice it off in `transform`.
 * Attribution is preserved via each listing's sourceUrl. Public API; remote
 * jobs (diaspora-relevant).
 */
module.exports = {
  source: {
    id: 'remoteok-jobs',
    name: 'RemoteOK — Remote Jobs (public API)',
    enabled: true,
    format: 'json',
    fetch: { type: 'http', url: 'https://remoteok.com/api' },
    parseOptions: {}, // whole array
    schedule: '0 */6 * * *',
    ownerUserId: 'imported-listings',
    region: 'Diaspora',
    license: 'Public API (remoteok.com) — remote jobs; attribution required (sourceUrl).',
    thresholds: { autoPublishQuality: 0.7, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'id',
      title: { path: 'position', transform: 'trim' },
      description: { path: 'description', transform: ['stripHtml', 'trim'] },
      category: { const: 'jobs' },
      company: 'company',
      location: { path: 'location', default: 'Remote' },
      images: { path: 'company_logo', transform: 'splitImages' },
      url: ['apply_url', 'url'],
      priceType: { const: 'none' },
      postedAt: { path: 'date', transform: 'isoDate' },
    },
  },
  // Drop RemoteOK's leading legal-notice element.
  transform(records) {
    if (Array.isArray(records) && records.length && records[0] && records[0].legal) {
      return records.slice(1);
    }
    return records;
  },
};
