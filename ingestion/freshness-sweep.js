#!/usr/bin/env node
'use strict';
/**
 * Freshness sweep — makes the feed feel live & local by retiring stale deadweight.
 *
 *   node freshness-sweep.js            # DRY RUN: report only, changes nothing
 *   APPLY=1 node freshness-sweep.js    # expire the candidates (reversible status flip)
 *
 * The discovery feed only shows status=='active' listings, so setting a stale
 * listing's status to 'expired' removes it from every user's feed WITHOUT an app
 * change and WITHOUT deleting anything (reversible: reactivate by setting status
 * back to 'active'). Organic, photographed, contactable, recent listings are kept.
 *
 * Rule (env-tunable):
 *   TTL_DAYS         default 120  — a listing is "stale" if not updated in this long
 *   LOW_QUALITY_ONLY default 1    — only expire stale listings that ALSO lack a photo
 *                                   OR a contact path (pure deadweight). Set 0 to
 *                                   expire every stale listing regardless of quality.
 *   PROTECT_ORGANIC  default 1    — never expire user-posted listings (no `source`).
 *
 * Reads `listings`; in APPLY mode writes status/expiredAt on candidates and a
 * summary to data_stats/freshness_sweep. Credentials follow compute-source-quality.js.
 */
const admin = require('firebase-admin');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const APPLY = process.env.APPLY === '1';
const TTL_DAYS = Number(process.env.TTL_DAYS || 120);
const LOW_QUALITY_ONLY = process.env.LOW_QUALITY_ONLY !== '0';
const PROTECT_ORGANIC = process.env.PROTECT_ORGANIC !== '0';
const NOW = Date.now();

// African countries (names + ISO2), lowercased, for the local-relevance report.
const AFRICA = new Set(('dz eg ly ma tn sd ss ao bj bw bf bi cv cm cf td km cd cg ci dj gq er sz et ga gm gh gn gw ke ls lr mg mw ml mr mu yt na ne ng re rw sh st sn sc sl so za tz tg ug zm zw eh ' +
  'algeria egypt libya morocco tunisia sudan "south sudan" angola benin botswana "burkina faso" burundi "cape verde" "cabo verde" cameroon "central african republic" chad comoros congo "democratic republic of the congo" drc "ivory coast" "cote d\'ivoire" djibouti "equatorial guinea" eritrea eswatini swaziland ethiopia gabon gambia ghana guinea "guinea-bissau" kenya lesotho liberia madagascar malawi mali mauritania mauritius namibia niger nigeria reunion rwanda "sao tome" senegal seychelles "sierra leone" somalia "south africa" tanzania togo uganda zambia zimbabwe "western sahara"')
  .match(/"[^"]+"|\S+/g).map((s) => s.replace(/"/g, '')));

const ageDaysOf = (x) => {
  const v = x.updatedAt || x.createdAt || x.freshnessAt;
  let ms = null;
  if (v && typeof v.toDate === 'function') ms = v.toDate().getTime();
  else if (typeof v === 'string') { const p = Date.parse(v); if (!isNaN(p)) ms = p; }
  else if (typeof v === 'number') ms = v;
  return ms == null ? null : (NOW - ms) / 86400000;
};
const hasContact = (x) => {
  const v = (s) => typeof s === 'string' && s.trim().length > 0;
  return v(x.phoneNumber) || v(x.email) || v(x.website) || v(x.whatsapp) || v(x.sourceUrl) || v(x.url);
};
const hasPhoto = (x) => !!(x.coverImage || x.hasImage || (Array.isArray(x.images) && x.images.length));
const isAfrican = (x) => {
  const c = String(x.country || '').trim().toLowerCase();
  return c ? AFRICA.has(c) : false;
};

(async () => {
  const buckets = { '<=30': 0, '31-90': 0, '91-180': 0, '>180': 0, unknown: 0 };
  let total = 0, noPhoto = 0, noContact = 0, african = 0, nonAfrican = 0, unknownCountry = 0;
  const candidates = [];

  const PAGE = 2000;
  let last = null;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').where('status', '==', 'active').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const x = d.data();
      total++;
      const age = ageDaysOf(x);
      if (age == null) buckets.unknown++;
      else if (age <= 30) buckets['<=30']++;
      else if (age <= 90) buckets['31-90']++;
      else if (age <= 180) buckets['91-180']++;
      else buckets['>180']++;
      const photo = hasPhoto(x), contact = hasContact(x);
      if (!photo) noPhoto++;
      if (!contact) noContact++;
      if (x.country) { isAfrican(x) ? african++ : nonAfrican++; } else unknownCountry++;

      // Candidate rule
      const stale = age != null && age > TTL_DAYS;
      const lowQuality = !photo || !contact;
      const organic = !x.source;
      if (stale && (!LOW_QUALITY_ONLY || lowQuality) && !(PROTECT_ORGANIC && organic)) {
        candidates.push(d.id);
      }
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  console.log('--- FRESHNESS SWEEP (%s) ---', APPLY ? 'APPLY' : 'DRY RUN');
  console.log('active listings      :', total);
  console.log('age buckets (days)   :', JSON.stringify(buckets));
  console.log('no photo             :', noPhoto);
  console.log('no contact path      :', noContact);
  console.log('country: african     :', african, '| non-african:', nonAfrican, '| unknown:', unknownCountry);
  console.log('rule                 : stale>%dd%s%s', TTL_DAYS,
    LOW_QUALITY_ONLY ? ' AND (no photo OR no contact)' : '', PROTECT_ORGANIC ? ' AND not user-posted' : '');
  console.log('candidates to expire :', candidates.length,
    total ? `(${((candidates.length / total) * 100).toFixed(1)}% of active)` : '');

  if (APPLY && candidates.length) {
    let done = 0;
    for (let i = 0; i < candidates.length; i += 400) {
      const batch = db.batch();
      for (const id of candidates.slice(i, i + 400)) {
        batch.set(db.collection('listings').doc(id),
          { status: 'expired', expiredAt: new Date().toISOString(), expiredReason: 'stale_sweep' }, { merge: true });
      }
      await batch.commit();
      done += Math.min(400, candidates.length - i);
      console.log(`  …expired ${done}/${candidates.length}`);
    }
  }

  await db.collection('data_stats').doc('freshness_sweep').set({
    mode: APPLY ? 'apply' : 'dry_run',
    ttlDays: TTL_DAYS, lowQualityOnly: LOW_QUALITY_ONLY, protectOrganic: PROTECT_ORGANIC,
    activeBefore: total, ageBuckets: buckets, noPhoto, noContact,
    african, nonAfrican, unknownCountry,
    candidates: candidates.length, expired: APPLY ? candidates.length : 0,
    ranAtIso: new Date().toISOString(), ranAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: false });

  console.log(APPLY ? '✅ applied; feed refreshed' : 'ℹ️ dry run only — set APPLY=1 to expire');
  process.exit(0);
})().catch((e) => { console.error('freshness-sweep failed:', e.message); process.exit(1); });
