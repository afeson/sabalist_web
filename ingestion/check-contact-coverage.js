'use strict';
/* Contact-path coverage audit. Every active listing must have at least one
   reachable contact: phoneNumber, email, website, whatsapp, or sourceUrl/url.
   Read-only — reports counts and a sample of any listing with NO contact. */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const hasContact = (x) => !!(
  (x.phoneNumber && String(x.phoneNumber).trim()) ||
  (x.email && String(x.email).trim()) ||
  (x.website && String(x.website).trim()) ||
  (x.whatsapp && String(x.whatsapp).trim()) ||
  (x.sourceUrl && String(x.sourceUrl).trim()) ||
  (x.url && String(x.url).trim())
);

(async () => {
  const snap = await db.collection('listings').get();
  let total = 0, active = 0, withContact = 0, noContact = 0;
  const bySourceNoContact = {};
  const sample = [];
  snap.forEach((d) => {
    const x = d.data(); total++;
    const st = x.status || 'active';
    if (st === 'expired' || st === 'sold' || st === 'inactive') return;
    active++;
    if (hasContact(x)) { withContact++; return; }
    noContact++;
    const src = x.source || '(user)';
    bySourceNoContact[src] = (bySourceNoContact[src] || 0) + 1;
    if (sample.length < 25) sample.push({ id: d.id, src, title: (x.title || '').slice(0, 40), cat: x.categoryId });
  });
  const pct = active ? Math.round(withContact / active * 100) : 0;
  console.log('=== CONTACT COVERAGE ===');
  console.log(`total ${total} | active ${active} | with contact ${withContact} (${pct}%) | NO contact ${noContact}`);
  if (noContact) {
    console.log('\nno-contact by source:');
    Object.entries(bySourceNoContact).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ', String(v).padStart(6), k));
    console.log('\nsample:');
    sample.forEach((s) => console.log('  ', s.id, '|', s.src, '|', s.cat, '|', s.title));
  } else {
    console.log('100% contact coverage ✓');
  }
  process.exit(0);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
