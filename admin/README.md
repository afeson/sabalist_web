# Sabalist Ingestion Admin Dashboard

A self-contained admin SPA (no build step) for monitoring ingestion and working
the review queue. Reads the collections the ingestion engine writes
(`ingestion_stats`, `listings_staging`, `import_failures`) and publishes/rejects
items from the review queue.

## Tabs
- **Overview** — recent auto-published / pending review / rejected / records seen.
- **Review Queue** — listings flagged (duplicate / uncertain / low quality /
  missing info). **Approve** → writes to live `listings`; **Reject** → marks the
  staging doc rejected.
- **Source Health** — per-source last run, totals, and a health flag (from `ingestion_stats`).
- **Failed Imports** — recent fetch/parse/validation failures.

## Setup
1. `cp admin/config.example.js admin/config.js` and fill the public Firebase web
   config + `adminEmails` (the throwaway `config.js` is gitignored).
2. Deploy the admin Firestore rules so the dashboard can read the collections:
   merge `ingestion/firestore-admin.rules` into `firestore.rules`, keep the
   allowlist in sync with `config.js`, then `npx firebase deploy --only firestore:rules`.
3. Serve it. Locally: `npx serve admin`. Hosted: drop `admin/` behind auth on a
   subpath/subdomain (e.g. Firebase Hosting or a Vercel static deploy). It's
   `noindex` and gated by Firebase Auth + the email allowlist.

## Security
- Client allowlist (`adminEmails`) is convenience UX; the **Firestore rules are
  the real gate** — keep both in sync. Sign-in is Firebase Auth (Google).
- Sync writes use the admin SDK (service account) and bypass rules; the rules
  only govern this dashboard's reads + review actions.

## Not yet (Phase 2 follow-ups)
- Source CRUD from the UI (add/enable/disable/schedule) — requires moving source
  configs from `ingestion/sources/*.json` into an `ingestion_sources` collection.
- Duplicate-report drill-down + bulk approve/reject.
- Live charts for per-source trends.
