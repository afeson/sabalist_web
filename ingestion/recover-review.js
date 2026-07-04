'use strict';
/**
 * Review-queue recovery — publish the provably-safe net-new subset of
 * `listings_staging` (precision-first, mirrors the analyze-review methodology).
 *
 * A held record is recovered ONLY if ALL of:
 *   1. reason == 'duplicate_uncertain'  (the borderline band; measured ~87%
 *      genuinely-distinct in sampling)
 *   2. its matched live listing exists AND name-token jaccard < 0.4
 *      (clearly a different business, not a name variant)
 *   3. it carries at least one INDEPENDENT identity signal vs the match:
 *      different non-empty phoneE164, different non-empty domain, or
 *      coordinates > 300 m apart.
 *
 * Anything failing a gate stays in staging untouched. Recovered staging docs
 * are marked status='recovered' (+publishedId) so re-runs are idempotent.
 * Search fields are (re)stamped at publish time — older staged docs predate
 * searchKeywords.
 *
 * CLI: node recover-review.js [--dry] [--limit N] [--concurrency 12]
 */
const admin = require('firebase-admin');
const { buildSearchFields } = require('./lib/searchKeywords');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith('--') ? v : true; };
const dry = argv.includes('--dry');
const limit = Number(arg('limit', 0)) || 0;
const CONC = Math.max(1, Number(arg('concurrency', 12)) || 12);
// Which staging reasons to process. The `duplicate` bucket is dominated by
// Overture-era holds (81% carry phone/website) so the independent-signal gates
// have real data to work with there too.
const REASONS = String(arg('reasons', 'duplicate_uncertain,duplicate')).split(',').map((s) => s.trim()).filter(Boolean);

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();
const STAGING = db.collection('listings_staging');
const LIVE = db.collection('listings');

const tok = (s) => new Set(String(s || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean));
const jacc = (a, b) => { const A = tok(a), B = tok(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const distM = (a, b) => {
  if (![a.latitude, a.longitude, b.latitude, b.longitude].every((v) => typeof v === 'number')) return null;
  const R = 6371000, dLa = (b.latitude - a.latitude) * Math.PI / 180, dLo = (b.longitude - a.longitude) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

async function judge(sdoc) {
  const s = sdoc.data();
  const L = s.listing || {};
  if (!s.matchId || !L.title) return { verdict: 'keep', why: 'no_match_or_title' };
  const m = await LIVE.doc(s.matchId).get();
  if (!m.exists) return { verdict: 'publish', why: 'match_gone' }; // matched doc deleted → nothing to duplicate
  const M = m.data();
  const j = jacc(L.title, M.title);
  if (j >= 0.4) return { verdict: 'keep', why: `name_similar(${j.toFixed(2)})` };
  const phoneDiff = L.phoneE164 && M.phoneE164 && L.phoneE164 !== M.phoneE164;
  const domainDiff = L.domain && M.domain && L.domain !== M.domain;
  const d = distM(L, M);
  const farApart = d != null && d > 300;
  if (phoneDiff || domainDiff || farApart) {
    return {
      verdict: 'publish',
      why: [phoneDiff && 'phone', domainDiff && 'domain', farApart && 'geo'].filter(Boolean).join('+'),
      pair: [L.title, M.title],
    };
  }
  return { verdict: 'keep', why: 'no_independent_signal' };
}

(async () => {
  const PAGE = 500;
  let scanned = 0, published = 0, kept = 0;
  const whyStats = {};
  const samples = []; // dry-run: example pairs for human precision review

  for (const reason of REASONS) {
    let last = null;
    while (true) {
      let q = STAGING.where('reason', '==', reason).where('status', '==', 'pending')
        .orderBy('__name__').limit(PAGE);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;

      for (let i = 0; i < snap.docs.length; i += CONC) {
        await Promise.all(snap.docs.slice(i, i + CONC).map(async (sdoc) => {
          scanned++;
          const { verdict, why, pair } = await judge(sdoc);
          const key = `${reason}:${why}`;
          whyStats[key] = (whyStats[key] || 0) + 1;
          if (verdict !== 'publish') { kept++; return; }
          if (dry) {
            published++;
            if (pair && samples.length < 40 && published % 7 === 1) samples.push(`[${why}] "${pair[0]}"  vs live  "${pair[1]}"`);
            return;
          }
          const L = sdoc.data().listing;
          const now = new Date().toISOString();
          const doc = { ...L, ...buildSearchFields(L), createdAt: L.importedAt || now, updatedAt: now };
          const ref = await LIVE.add(doc);
          await sdoc.ref.set({ status: 'recovered', publishedId: ref.id, recoveredAt: now }, { merge: true });
          published++;
        }));
      }
      last = snap.docs[snap.docs.length - 1];
      if (scanned % 20000 < PAGE) console.log(`  …scanned ${scanned}, published ${published}, kept ${kept}`);
      if (limit && scanned >= limit) break;
      if (snap.size < PAGE) break;
    }
    console.log(`  [${reason}] done — cumulative scanned ${scanned}, published ${published}`);
    if (limit && scanned >= limit) break;
  }

  console.log(`\n── REVIEW RECOVERY ${dry ? '[DRY]' : '[LIVE]'} ──`);
  console.log(JSON.stringify({ scanned, published, kept, whyStats }, null, 2));
  if (dry && samples.length) {
    console.log('\n── SAMPLE would-publish pairs (staged vs matched-live) ──');
    for (const s of samples) console.log('  ' + s);
  }
  process.exit(0);
})().catch((e) => { console.error('recover failed:', e.message); process.exit(1); });
