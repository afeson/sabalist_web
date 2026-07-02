#!/usr/bin/env node
'use strict';
/**
 * African Business Acquisition Engine — post-processing pass.
 *
 * DISCOVERY + IMPORT is the existing OSM/Overpass sync (connectors/overpass.js +
 * osmDiaspora.js, run weekly by .github/workflows/sync-directories.yml). This
 * script runs AFTER import and does the two things that turn raw imported
 * businesses into a claimable, appealing catalogue:
 *
 *   Phase 1 — CLAIM BACKFILL (cheap, all): every business-source listing that
 *     predates the pipeline's claim-tagging gets businessId + sellerName +
 *     claimable + businessVerified, so its owner can take it over via /claim and
 *     then post real products with the AI Listing Assistant. New imports are
 *     already tagged by lib/pipeline.js.
 *
 *   Phase 2 — AI ENRICHMENT (budgeted): rewrites the templated OSM description
 *     into a short, appealing, TRUTHFUL one using Claude (batched). Capped at
 *     MAX_ENRICH per run to control cost; idempotent via the aiEnriched flag.
 *
 * Dedup is handled upstream by the pipeline (sourceKey/fingerprint). Writes a
 * summary to data_stats/business_acquisition. Read/write over `listings` only.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT (required), ANTHROPIC_API_KEY (enables Phase 2),
 *      AI_MODEL (default claude-haiku-4-5-20251001), MAX_ENRICH (default 300).
 */
const admin = require('firebase-admin');

const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : admin.credential.applicationDefault();
admin.initializeApp({ credential });
const db = admin.firestore();

const BUSINESS_SOURCES = ['osm-africa-businesses', 'osm-diaspora-african'];
const MAX_ENRICH = Number(process.env.MAX_ENRICH || 300);
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const AI_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();

const slugBusinessId = (s) =>
  'business-' + (String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x');

async function claudeBatch(items) {
  // items: [{i, name, kind, city, country}] -> [{i, description}]
  const system =
    'You write short, appealing, TRUTHFUL one-line descriptions for African local businesses listed from OpenStreetMap. ' +
    'You are given ONLY the business name, type, and city. NEVER invent prices, opening hours, phone numbers, ratings, awards, or specific product claims. ' +
    'Write 1–2 upbeat, generic sentences about what this kind of business offers and where it is. Keep it honest and non-specific where unsure. ' +
    'Return ONLY a JSON array of objects {"i": number, "description": string}, nothing else.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: AI_MODEL, max_tokens: 1500, system,
      messages: [{ role: 'user', content: 'Businesses:\n' + JSON.stringify(items) + '\n\nReturn the JSON array now.' }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const s = text.indexOf('['), e = text.lastIndexOf(']');
  if (s === -1 || e === -1) return [];
  try { return JSON.parse(text.slice(s, e + 1)); } catch { return []; }
}

(async () => {
  const stats = { businessTotal: 0, claimBackfilled: 0, alreadyClaimable: 0, enrichedThisRun: 0, alreadyEnriched: 0, enrichFailed: 0 };
  const claimBatch = [];
  const enrichCandidates = [];

  // Single stream over business-source listings (Firestore `in`, ≤10 values).
  const PAGE = 1000;
  let last = null;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = db.collection('listings').where('source', 'in', BUSINESS_SOURCES).orderBy('__name__').limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const x = d.data();
      stats.businessTotal++;
      // Phase 1 candidate: missing claim fields.
      if (!x.businessId || x.claimable !== true) {
        claimBatch.push({ id: d.id, title: x.title });
      } else {
        stats.alreadyClaimable++;
      }
      // Phase 2 candidate: not yet AI-enriched.
      if (x.aiEnriched === true) stats.alreadyEnriched++;
      else if (enrichCandidates.length < MAX_ENRICH) {
        enrichCandidates.push({ id: d.id, title: x.title, kind: x.categoryId || x.category || 'business', city: x.city || '', country: x.country || '' });
      }
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  // ---- Phase 1: claim backfill (batched) ----
  for (let i = 0; i < claimBatch.length; i += 400) {
    const batch = db.batch();
    for (const c of claimBatch.slice(i, i + 400)) {
      batch.set(db.collection('listings').doc(c.id), {
        sellerName: c.title || '', businessId: slugBusinessId(c.title),
        claimable: true, businessVerified: false, updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    stats.claimBackfilled += Math.min(400, claimBatch.length - i);
  }

  // ---- Phase 2: AI enrichment (batched Claude calls) ----
  if (AI_KEY && enrichCandidates.length) {
    for (let i = 0; i < enrichCandidates.length; i += 8) {
      const chunk = enrichCandidates.slice(i, i + 8);
      let out = [];
      try {
        out = await claudeBatch(chunk.map((c, j) => ({ i: j, name: c.title, kind: c.kind, city: c.city, country: c.country })));
      } catch (e) {
        stats.enrichFailed += chunk.length;
        console.warn('enrich chunk failed:', e.message);
        continue;
      }
      const byI = new Map(out.map((o) => [o.i, o.description]));
      const batch = db.batch();
      let n = 0;
      chunk.forEach((c, j) => {
        const desc = String(byI.get(j) || '').trim();
        if (!desc) return;
        batch.set(db.collection('listings').doc(c.id), {
          description: desc.slice(0, 500) + ' · via OpenStreetMap',
          aiEnriched: true, aiEnrichedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }, { merge: true });
        n++;
      });
      if (n) { await batch.commit(); stats.enrichedThisRun += n; }
    }
  } else if (!AI_KEY) {
    console.log('ℹ️ ANTHROPIC_API_KEY not set — skipping Phase 2 (enrichment).');
  }

  const remainingToEnrich = Math.max(0, stats.businessTotal - stats.alreadyEnriched - stats.enrichedThisRun);
  const summary = {
    businessTotal: stats.businessTotal,
    claimBackfilled: stats.claimBackfilled,
    claimableTotal: stats.alreadyClaimable + stats.claimBackfilled,
    enrichedThisRun: stats.enrichedThisRun,
    enrichedTotal: stats.alreadyEnriched + stats.enrichedThisRun,
    enrichFailed: stats.enrichFailed,
    remainingToEnrich,
    model: AI_KEY ? AI_MODEL : null,
    ranAtIso: new Date().toISOString(),
    ranAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('data_stats').doc('business_acquisition').set(summary, { merge: false });

  console.log('--- BUSINESS ACQUISITION ENGINE ---');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
})().catch((e) => { console.error('business-acquisition failed:', e.message); process.exit(1); });
