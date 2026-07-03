'use strict';
/**
 * Read-only diagnostic: break down the listings_staging review queue.
 *
 * For each dup-reason bucket, compare the HELD listing's name against the LIVE
 * listing it matched (matchId → `listings`). If the names are near-identical the
 * hold is a true duplicate (its twin is already published — nothing lost). If the
 * names are clearly different, dedup was over-cautious (a geo/phone collision
 * between two genuinely distinct businesses) and the record is RECOVERABLE.
 *
 * No writes. Requires FIREBASE_SERVICE_ACCOUNT (same secret the imports use).
 */
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const col = db.collection('listings_staging');
const live = db.collection('listings');

const SAMPLE = Number(process.env.SAMPLE || 1200); // per dup bucket

const tok = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9À-￿ ]/g, ' ').split(/\s+/).filter(Boolean));
const jacc = (a, b) => { const A = tok(a), B = tok(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

(async () => {
  const tot = (await col.count().get()).data().count;
  console.log('=== listings_staging (review queue) ===');
  console.log('TOTAL held:', tot);
  const reasons = ['duplicate', 'duplicate_uncertain', 'missing_required', 'low_quality', 'low_confidence'];
  const counts = {};
  for (const r of reasons) { counts[r] = (await col.where('reason', '==', r).count().get()).data().count; console.log('  ' + r.padEnd(20), counts[r]); }

  for (const r of ['duplicate', 'duplicate_uncertain']) {
    if (!counts[r]) continue;
    const snap = await col.where('reason', '==', r).limit(SAMPLE).get();
    const hist = {};
    let n = 0, trueDup = 0, distinct = 0, gone = 0, nomatch = 0;
    for (const d of snap.docs) {
      n++;
      const s = d.get('similarity');
      const b = s == null ? 'null' : (s < 0.68 ? '.62-.68' : s < 0.74 ? '.68-.74' : s < 0.80 ? '.74-.80' : s < 0.90 ? '.80-.90' : '.90+');
      hist[b] = (hist[b] || 0) + 1;
      const mid = d.get('matchId');
      const title = d.get('listing.title');
      if (!mid) { nomatch++; continue; }
      try {
        const m = await live.doc(mid).get();
        if (!m.exists) { gone++; continue; }
        const j = jacc(title, m.get('title'));
        if (j >= 0.6) trueDup++; else distinct++;
      } catch { gone++; }
    }
    const pct = (x) => n ? (100 * x / n).toFixed(0) + '%' : '-';
    console.log(`\n[${r}] sampled ${n} of ${counts[r]}`);
    console.log('  similarity histogram:', JSON.stringify(hist));
    console.log(`  name matches live twin (TRUE DUP, already published): ${trueDup} (${pct(trueDup)})`);
    console.log(`  name clearly differs (RECOVERABLE net-new):           ${distinct} (${pct(distinct)})`);
    console.log(`  matched-live doc missing/error:                       ${gone + nomatch}`);
  }
  console.log('\nDONE');
  process.exit(0);
})().catch((e) => { console.error('ANALYZE-ERR', e.message); process.exit(1); });
