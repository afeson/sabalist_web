#!/usr/bin/env node
'use strict';
/**
 * Listings delete-watchdog (detection half of the security safety net).
 *
 *   node security-watchdog.js
 *
 * Counts the whole `listings` collection and compares it to the previous run's
 * total, stored in data_stats/listing_watchdog. A sudden large DROP between runs
 * is the signature of a mass-deletion attack (the rules layer can't block an
 * unauthenticated native-style delete — see firestore.rules — so we DETECT
 * instead). On a suspicious drop it:
 *   - writes an alert doc to security_alerts/<autoid>,
 *   - posts to SLACK_WEBHOOK if configured,
 *   - exits non-zero so the scheduled GitHub Action fails and GitHub emails the
 *     repo owner (free push/email alert with no extra infra).
 *
 * Thresholds (env, optional): ALERT_MIN (default 50 listings),
 * ALERT_PCT (default 0.05 = 5%). Alerts when drop > max(ALERT_MIN, last*ALERT_PCT).
 *
 * Read-only over `listings`; writes only data_stats/listing_watchdog (+ an alert
 * doc when triggered). Credentials follow the compute-source-quality.js pattern.
 */
const admin = require('firebase-admin');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const ALERT_MIN = Number(process.env.ALERT_MIN || 50);
const ALERT_PCT = Number(process.env.ALERT_PCT || 0.05);

async function countListings() {
  const PAGE = 3000;
  let last = null;
  let total = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    total += snap.size;
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
  return total;
}

async function postSlack(text) {
  const url = process.env.SLACK_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  } catch (e) {
    console.warn('slack post failed:', e.message);
  }
}

(async () => {
  const ref = db.collection('data_stats').doc('listing_watchdog');
  const prev = (await ref.get()).data() || {};
  const last = typeof prev.lastTotal === 'number' ? prev.lastTotal : null;

  const total = await countListings();
  const peak = Math.max(prev.peakTotal || 0, total);
  const drop = last == null ? 0 : last - total;
  const threshold = Math.max(ALERT_MIN, Math.round((last || 0) * ALERT_PCT));
  const suspicious = last != null && drop > threshold;

  // Always advance the baseline so we alert once per sudden drop, not every run.
  await ref.set({
    lastTotal: total,
    prevTotal: last,
    peakTotal: peak,
    lastDrop: drop,
    updatedAtIso: new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`listings total: ${total} | previous: ${last} | drop: ${drop} | threshold: ${threshold}`);

  if (suspicious) {
    const msg = `🚨 Sabalist watchdog: listings dropped by ${drop} (from ${last} to ${total}) since last check — possible mass deletion. Threshold was ${threshold}.`;
    await db.collection('security_alerts').add({
      type: 'mass_delete_suspected',
      previousTotal: last,
      currentTotal: total,
      drop,
      threshold,
      createdAtIso: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await postSlack(msg);
    console.error(msg);
    process.exit(1); // fail the Action -> GitHub emails the repo owner
  }

  console.log('watchdog OK — no suspicious drop.');
  process.exit(0);
})().catch((e) => { console.error('security-watchdog failed:', e.message); process.exit(1); });
