# Sabalist Listing Ingestion Engine

A backend system that collects public listings from many sources (CSV/JSON/XML/RSS
feeds, public APIs, partner feeds), normalizes them into Sabalist's schema, and
intelligently **auto-publishes** high-confidence listings or routes uncertain
ones to an **admin review queue** — at scale, with quality + dedup controls.

> **Status: Phases 1 + 3 built, runnable, tested against LIVE public APIs.**
> Phase 1 = the engine. Phase 3 = the connector framework, real connectors
> (Remotive, Arbeitnow), the sync orchestrator, and scheduled continuous sync.
> Phase 2 (admin dashboard) is in progress. This is the core every source plugs into.

```
node run.js  --source sources/remotive-jobs.json --dry  # one source, live API, no creds
node sync.js --dry                                       # ALL enabled sources at once
npm test                                                 # pipeline assertions
```

Verified live: `sync.js --dry` pulls ~140 real jobs from Remotive + Arbeitnow +
the sample feed → ~122 auto-published, ~17 to review, spam rejected, multi-city
repostings de-duplicated.

## How it works

```
 raw feed ──▶ adapter ──▶ mapping engine ──▶ PIPELINE ──▶ store
 (csv/json/    (parse)     (source field      │            (Firestore /
  xml/rss)                  map → draft)       │             in-memory)
                                               ▼
   validate → geo/currency/language → auto-categorize → image-verify
   → dedup → quality/spam score → ROUTE:
        • reject   (spam / fatally invalid)
        • update   (same source listing re-synced)
        • publish  (high quality + high confidence, not a duplicate)
        • review   (duplicate / uncertain / low quality / missing info)
```

### Modules (`ingestion/`)
| File | Responsibility |
|---|---|
| `adapters/index.js` | Parse CSV / JSON / XML / RSS payloads → records (dependency-free) |
| `lib/mappingEngine.js` | Config-driven field mapping + transforms (no code per source) |
| `lib/taxonomy.js` | Category list + alias resolution + keyword auto-categorization |
| `lib/geo.js` | Country / city / currency / language detection (priority markets) |
| `lib/quality.js` | Quality score + spam detection |
| `lib/dedup.js` | Identity key (re-sync) + fuzzy fingerprint/title match |
| `lib/pipeline.js` | Orchestrates all stages + routing decision |
| `lib/firestore.js` | `firebase-admin` store (live mode) |
| `lib/storeMemory.js` | In-memory store (dry runs / tests) |
| `run.js` | CLI runner |

## Adding a source (no code — just JSON)
See `sources/sample-csv.json`. A source declares its `format`, how to `fetch`
(file / http / inline), and a `mapping` from its fields to Sabalist's
(`title`, `description`, `amount`, `currency`, `location`, `country`, `category`,
`images`, `phoneNumber`, …). Transforms (`trim`, `priceAmount`, `splitImages`,
`stripHtml`, `isoDate`, …) cover most feeds without custom code.

```jsonc
{ "id": "my-feed", "format": "rss",
  "fetch": { "type": "http", "url": "https://example.com/listings.rss" },
  "schedule": "0 */4 * * *", "ownerUserId": "imported-listings",
  "mapping": { "title": "title", "description": {"path":"description","transform":"stripHtml"},
               "amount": {"path":"price","transform":"priceAmount"}, "url": "link" } }
```

## Going live (Firestore)
1. `cd ingestion && npm install` (pulls `firebase-admin`).
2. Provide a service account: `GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json`
   (or `FIREBASE_SERVICE_ACCOUNT='<json>'`).
3. Create indexes on `listings` + `listings_staging`: single-field on
   `sourceKey`, `fingerprint`, `source`, `categoryId`.
4. `node run.js --source sources/<your>.json`  (omit `--dry`).

Writes go to: `listings` (live), `listings_staging` (review queue),
`import_failures` (audit), `ingestion_stats` (per-run metrics).

> **Re-sync & expiry:** each doc stores `source`, `sourceKey`, `fingerprint`.
> Re-running a source updates matching docs; `store.expireStale()` marks
> listings not seen for `expireAfterDays` as `expired`.

## ⚠️ Legal / compliance (read before enabling real sources)
Collecting *other sites'* listings can violate their Terms of Service, copyright,
database rights, and seller privacy (esp. GDPR/UK-GDPR for EU/UK personal data
like phone numbers). Only enable sources you are licensed/permitted to use
(official APIs, partner feeds, open-data/gov portals, sources whose ToS allow
republication). Prefer attribution + link-back where required. Scraping is the
highest-risk path — keep it for sources that explicitly allow it.

## Connectors & continuous sync (Phase 3)
- **Registry** (`lib/registry.js`) discovers sources from `sources/*.json`
  (declarative) **and** `connectors/*.js` (code connectors with custom
  fetch/transform). Add a source → it's picked up automatically; the engine never changes.
- **Live connectors shipped:** `remotive-jobs`, `arbeitnow-jobs` (public job
  APIs; diaspora + Europe). Each is config-only — a template for adding more.
- **Orchestrator** (`sync.js`) runs every enabled source, records per-run stats
  (`ingestion_stats`), and `--expire` marks stale listings expired.
- **Scheduling:** `.github/workflows/ingestion-sync.yml` runs `sync.js` every
  6h (UTC). Add repo secret `FIREBASE_SERVICE_ACCOUNT` (+ any source API keys)
  to enable live writes. Alternatives: any cron calling `node sync.js`, or a
  node-cron daemon honoring each source's `schedule`.
- **Adding keyed/partner sources:** put the key in a secret and reference it in
  the source `fetch.headers`, e.g. `{ "Authorization": "Bearer ${MY_API_KEY}" }`
  (`${ENV}` is interpolated). Property/vehicle/MLS/dealer feeds generally require
  a licensed key or partnership — wire them here once you have access.

## Roadmap
- **Phase 1 — Engine — DONE.**
- **Phase 3 — Connectors + sync + scheduling — DONE** (live job connectors;
  property/vehicle/classifieds connectors pending licensed access).
- **Phase 2 — Admin dashboard (in progress):** sources CRUD, import history,
  review queue (approve/edit/reject → publish), duplicate reports, source
  health, per-source analytics — admin-only area in the app (Firebase Auth allowlist).
- **Phase 4 — Scale & SEO:** queued workers for millions of docs, index tuning,
  network image verification/re-hosting, monitoring/alerts on source health.

## ⚠️ To actually auto-import into production you still need
1. A Firebase **service account** (`FIREBASE_SERVICE_ACCOUNT` secret) — without
   it, sync runs in dry mode only.
2. Firestore **indexes** on `sourceKey`, `fingerprint`, `source`, `categoryId`.
3. Decide on an **owner account** (`ownerUserId`, default `imported-listings`).
4. Confirm **rights/ToS** for each source before enabling it.
