# Sabalist SEO Web Layer (Next.js)

Server-rendered (SSR/ISR) indexable website for Sabalist. It renders the pages search engines, social unfurlers and AI crawlers need — **home, category, subcategory, country, city, city×category, listing, guides** — as real HTML with full metadata, JSON-LD, breadcrumbs and crawlable internal links. It reads the **same Firestore backend** as the Expo app (the `listings` collection is world-readable, so only the public `EXPO_PUBLIC_FIREBASE_*` config is required).

This is the implementation of the architecture in `../SEO_SYSTEM_AUDIT_AND_ARCHITECTURE.md`. The existing Expo/react-native-web SPA stays as the **interactive app** (post, edit, auth, chat, favorites); this layer owns the **indexable** routes.

## Why this exists
The live site is a client-rendered SPA: every URL returns one `index.html` shell, and the real titles/meta/JSON-LD only appear after JavaScript runs — invisible to Bing, Facebook/WhatsApp/X unfurlers, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). This layer fixes that at the root by sending fully-formed HTML per route.

## Quick start
```bash
cd seo-web
cp .env.example .env.local         # paste the same EXPO_PUBLIC_FIREBASE_* values the app uses
npm install
npm run dev                        # http://localhost:3000
```
Visit `/`, `/category/vehicles`, `/category/vehicles/cars`, `/nigeria`, `/nigeria/lagos`, `/nigeria/lagos/vehicles`, `/listing/<id>`, `/guides`. **View source** — title, meta, canonical, OG/Twitter and JSON-LD are all in the raw HTML (no JS needed).

## What's implemented
| Area | Files |
|------|-------|
| Canonical host + quality gate | `src/lib/site.ts` (`SITE.url = https://www.sabalist.com`, `INDEX_MIN_LISTINGS`) |
| Read-only Firestore | `src/lib/firebase.ts`, `src/lib/listings.ts` |
| Taxonomy / locations (ported, kept in sync) | `src/lib/taxonomy.ts`, `src/lib/locations.ts`, `scripts/sync-taxonomy.mjs` |
| Pricing + Product/Offer | `src/lib/pricing.ts` |
| Metadata system | `src/lib/metadata.ts` (`generateMetadata` everywhere) |
| Structured data | `src/lib/schema.ts` (Organization, WebSite, Product, Breadcrumb, CollectionPage, City/Place, FAQ, Article) + `src/components/JsonLd.tsx` |
| Internal linking | `src/components/InternalLinks.tsx`, `Breadcrumbs.tsx`, related listings on detail pages |
| Pages | `src/app/**` (home, category, subcategory, listing, country, city, city×category, guides, not-found) |
| Robots | `src/app/robots.ts` (public + AI agents; blocks app/private/debug) |
| Sitemaps | `src/app/sitemap-index.xml/route.ts` (master index) + `src/app/sitemaps/{categories,locations}.xml` + `sitemaps/listings/[page]` + `sitemaps/images/[page]` (image sitemap) + `src/app/sitemap.ts` (hub) |

## Rendering / freshness
ISR per page type (home 1h, category 30m, location 1h, listing 24h, guides on deploy). For instant listing updates the on-demand revalidation webhook is wired — see the "On-demand revalidation" section below.

## Deploy & routing (Phase 2)
1. Deploy this app to Vercel as its own project, domain `www.sabalist.com`.
2. Route indexable paths here and app paths to the SPA. Options: (a) host the SPA under `/app/*` in this same project via rewrites to the existing build, or (b) put the SPA on `app.sabalist.com` and keep `www` on Next.js.
3. 301 apex `sabalist.com` → `www.sabalist.com` at the domain level.
4. In Google Search Console: set `www.sabalist.com` primary, submit `https://www.sabalist.com/sitemap-index.xml`.

## Keeping data in sync
`npm run sync-taxonomy` regenerates `taxonomy.ts` from `../src/config/categories.js`. Extend `locations.ts` from `../src/config/cityRoutes.js` `SEO_COUNTRIES` as you add markets. Categories/locations stay single-source in the app.

## Notes
- Plain inline styles are used so the scaffold runs with zero extra deps; swap in your design system / Tailwind freely.
- Listing detail is read-only here; "Contact seller" deep-links into the app (`/app/listing/{id}`).
- This layer does **not** affect the iOS/Android builds.

## On-demand revalidation (instant updates)
ISR refreshes pages on a timer; the webhook refreshes them the moment a listing changes.

- **Webhook:** `POST /api/revalidate` (`src/app/api/revalidate/route.ts`), protected by `REVALIDATE_SECRET`. It revalidates the listing page plus the category/subcategory, the matching city/country/city×category pages, the home grid, and the sitemaps. `GET /api/revalidate` is a health check.
- **Trigger:** `integrations/firebase-functions/` — a Firestore `onDocumentWritten('listings/{id}')` Cloud Function that calls the webhook on every create/edit/sold/delete. See that folder's README to deploy, or call the webhook from any backend with `curl`.

Set `REVALIDATE_SECRET` in Vercel and the same value as `SEO_REVALIDATE_SECRET` for the function.

## /app routing (SPA stays interactive)
The Expo SPA continues to serve post/edit/auth/chat/favorites/profile under `/app/*`; Next.js owns the indexable root routes. Set `SPA_ORIGIN` to the SPA's deployment:

- **Single domain (rewrite):** `SPA_ORIGIN=https://<spa-host>` makes `next.config.mjs` proxy `/app/*` → the SPA (the rewrite strips `/app`). The SPA is built with asset base `/app` via `experiments.baseUrl` in `app.config.js` (env `EXPO_WEB_BASE_URL`, default `/app`), so it references `/app/_expo/...`; Next serves its own assets from `/_next`, so there's no collision. **Do not deploy an `/app`-based build to the bare root domain** — it only works behind this layer (or set `EXPO_WEB_BASE_URL=''` to serve at root pre-migration).
- **Subdomain (recommended, simplest):** deploy the SPA at `app.sabalist.com` and either keep `SPA_ORIGIN` blank and link out, or add a redirect `/app/:path*` → `https://app.sabalist.com/:path*`.

Listing pages already deep-link interactive actions to `/app/listing/{id}`; `robots.txt` disallows `/app/` so the SPA shell isn't indexed.
