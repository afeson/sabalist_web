# Sabalist — SEO Audit & Long‑Term SEO Architecture

**Prepared:** 30 June 2026
**Scope:** Website / backend only. No iOS/Android app build is affected. The mobile apps consume the same Firestore backend; nothing here changes app behavior.
**Stack audited:** Expo SDK 54 + `react-native-web` 0.21 SPA, React Navigation (not Expo Router), Firebase/Firestore, deployed on Vercel (with Amplify + Firebase Hosting configs also present).
**Decisions locked with stakeholder:** canonical host = **`www.sabalist.com`** (recommended); page generation = **quality‑gated** (only pages with real inventory); geo focus = **Pan‑African**; long‑term render architecture = **dedicated Next.js SEO web layer** consuming the same Firestore.

---

## 0. Executive summary

Sabalist already has a *surprisingly complete* SEO **intent** in the codebase: per‑page Helmet tags (`src/components/SEO.js`), a full JSON‑LD library (`src/utils/seo.js` — Product+Offer, BreadcrumbList, ItemList, FAQ, Organization, WebSite), a build‑time sitemap generator, a `robots.txt`, public browsing enabled on web, and even a location taxonomy (`src/config/cityRoutes.js`).

**None of it reaches search engines reliably, for one structural reason: the website is a client‑side‑rendered SPA.** Every URL returns the *same* `index.html` shell. The real `<title>`, meta description, canonical, Open Graph, Twitter and JSON‑LD are injected by JavaScript *after* the page boots. This was confirmed live: `/`, `/category/vehicles`, and a random 404 URL all return byte‑for‑byte identical metadata and an empty `<body>` that says *"You need to enable JavaScript to run this app."*

Consequences:

- **Googlebot** *can* render JS, but does so on a deferred, budget‑limited second pass — a poor fit for a marketplace with 45k+ listing URLs. Indexing is slow and incomplete, and rendered content competes for crawl budget.
- **Bing** renders JS inconsistently → weak Bing/DuckDuckGo presence.
- **Social unfurlers** (Facebook, WhatsApp, X/Twitter, LinkedIn, Telegram, iMessage) and **AI crawlers** (GPTBot, ClaudeBot, PerplexityBot, Google‑Extended, Bingbot/Copilot, Amazonbot) **do not execute JavaScript at all.** They see the generic homepage title and description on *every* page, and **zero structured data**. Your OG/Twitter cards and your AI‑search visibility are effectively broken site‑wide.

**The fix that unlocks everything is server‑rendered HTML per route.** The agreed path is a dedicated **Next.js (App Router) SEO layer** that renders home, category, subcategory, location, listing, and guide pages with real HTML + metadata + JSON‑LD + crawlable internal links, served from the same world‑readable Firestore collection. The Expo SPA remains the interactive app (post/edit/auth/chat). This document specifies that system and the migration to it, plus the immediate no‑regret fixes that apply regardless.

A starter implementation of the Next.js layer has been scaffolded in **`/seo-web`** (see §9 and `seo-web/README.md`).

---

## 1. Audit findings

Severity scale: **P0** = blocks ranking/indexing now · **P1** = major opportunity/defect · **P2** = polish.

### 1.1 Technical SEO & rendering

| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| T1 | **P0** | **Client‑side rendering only.** All routes serve one SPA shell; metadata + content are JS‑injected. Non‑JS crawlers and social/AI bots get generic homepage meta and no content. | Live fetch of `/`, `/category/vehicles`, `/<random‑404>` returned identical `<head>` meta and a `<body>` of "enable JavaScript". `public/index.html` + webpack template confirm SPA bootstrap. |
| T2 | **P0** | **Apex vs www serving split.** `www.sabalist.com/sitemap.xml` serves valid `application/xml`, but `sabalist.com/sitemap.xml` (apex) returns the **app‑shell HTML**. Yet all canonicals/OG/JSON‑LD/robots `Sitemap:` point at the **apex**. Search engines are told the canonical host is the one that mis‑serves the sitemap. | Live fetches of both hosts; `vercel.json`, `src/components/SEO.js` (`BASE_URL='https://sabalist.com'`), `public/robots.txt`. |
| T3 | **P1** | **Sitemap is a single monolith** (~4.2 MB, up to 45k listing URLs in one file) with **no sitemap index**, **no location URLs**, **no subcategory URLs**, and **no image sitemap**. The location taxonomy in `cityRoutes.js` is never emitted. | `scripts/generate-sitemap.js` (static + top‑level categories + listings only). |
| T4 | **P1** | **Debug/test HTML shipped to production** and routed publicly: `firestore-test.html`, `direct-firestore-write-test.html`, `simple-write-test.html`, `check-auth.html`, `app-firebase-test.html`, etc. These are crawlable, indexable, and expose internal Firestore testing surfaces. | `vercel.json` routes + `public/*.html`. |
| T5 | **P1** | **404s return HTTP 200** with the SPA shell (soft‑404). Unknown URLs (e.g. the random test URL) resolve to `index.html` with a 200 and generic meta — Google treats these as thin duplicates. | `vercel.json` catch‑all `"/(.*)" → /index.html`; live 404 test returned 200 + homepage meta. |
| T6 | **P2** | **`expo export:web` is the legacy webpack web export** (deprecated on SDK 54). Build note in repo already flags this; the modern equivalent is `npx expo export -p web`. Relevant because the SPA build remains the app even after the SEO layer ships. | `package.json` `vercel-build`, `WEB_SEO_CHANGES_2026-06-15.md`. |

### 1.2 On‑page SEO

| # | Severity | Finding |
|---|----------|---------|
| O1 | **P0** | Because of T1, **every indexable URL effectively shares one title and one meta description** (the static shell defaults). No keyword targeting reaches crawlers for categories, subcategories, locations, or listings. |
| O2 | **P1** | The Helmet `SEO.js` component is solid (per‑page title/description/canonical/OG/Twitter/robots/JSON‑LD) — it just needs to run **server‑side**. Porting its logic into the Next.js `generateMetadata` API preserves the work. |
| O3 | **P1** | **OG/Twitter image is the 512×512 maskable PWA icon** for all pages. Social cards should be 1200×630, and per‑listing cards should use the listing's first photo. |
| O4 | **P2** | No `lang`/`hreflang` strategy despite 12 supported UI languages (i18n is app‑side only). Decide whether SEO pages are English‑only (recommended at launch) or localized later. |

### 1.3 Structured data

| # | Severity | Finding |
|---|----------|---------|
| S1 | **P0** | All JSON‑LD is client‑injected (T1) → invisible to non‑rendering crawlers and unreliable for Google. Rich results will not appear. |
| S2 | **P1** | The schema library is good but incomplete for a marketplace: add **`CollectionPage`/`SearchResultsPage`** for category & location pages, **`Place`/`City`** for location pages, **`AggregateOffer`** where a category/location has many priced items, and a proper **`ImageObject`** on listings. |
| S3 | **P2** | `Product` uses a blanket `UsedCondition` and `availableAtOrFrom` from a free‑text `location` string. Map condition from listing data where present; keep `Place` name from the normalized city. |

### 1.4 Internal linking & crawlability

| # | Severity | Finding |
|---|----------|---------|
| L1 | **P0** | With CSR, internal links are rendered by JS; non‑JS crawlers find **no `<a href>` graph** to follow. The Next.js layer must emit real anchor links: category↔subcategory, category↔city, city↔country, listing→category/city, and related/similar listings. |
| L2 | **P1** | No hub pages today. Need crawlable hubs: a category index, a locations index (country → city), and footer link blocks interlinking the top category×city combos that have inventory. |

### 1.5 Indexability, canonicals, pagination, duplicates

| # | Severity | Finding |
|---|----------|---------|
| I1 | **P0** | Canonical host conflict (T2). Standardize on **www**, 301 apex→www at the edge, and rewrite every canonical/OG/JSON‑LD/sitemap/robots reference to `https://www.sabalist.com`. |
| I2 | **P1** | **No pagination strategy.** Category/location lists need stable paginated URLs (`?page=2` or `/page/2`) with self‑referencing canonicals, or a documented "noindex page 2+ / index page 1" rule. |
| I3 | **P1** | **Duplicate/thin risk** from quality‑gating gaps: a city×category page with 0–2 listings is a doorway page. Enforce a **minimum inventory threshold** before a location/category page is indexable (recommend `noindex,follow` below threshold, `index` above). |
| I4 | **P2** | `sabalist.web.app` / `*.firebaseapp.com` mirrors are reachable. Add canonical + 301 (or `noindex`) so mirrors don't compete. |

### 1.6 Core Web Vitals & mobile

| # | Severity | Finding |
|---|----------|---------|
| C1 | **P1** | SPA hydration of a full RN‑Web bundle is heavy → slow **LCP/INP** on mid‑range Android over African mobile networks. SSR/ISR pages (Next.js) with streamed HTML and `next/image` will be dramatically faster for indexable pages. |
| C2 | **P1** | Listing images are uploaded to Firebase Storage without documented responsive sizing. Serve resized/AVIF/WebP variants + width/height to protect LCP and CLS. |
| C3 | **P2** | `viewport` uses `maximum-scale=1.00001` (near‑disables pinch‑zoom) — an accessibility/mobile‑UX flag. Allow user scaling on indexable pages. |

### 1.7 Image SEO

| # | Severity | Finding |
|---|----------|---------|
| M1 | **P1** | No descriptive `alt` reaches crawlers (CSR). SSR listing/category pages must emit `alt` text built from listing title + category + city. |
| M2 | **P1** | **No image sitemap.** Add `<image:image>` entries (listing cover + gallery) so listing photos can rank in Google Images — a real discovery channel for classifieds. |

### 1.8 AI search readiness

| # | Severity | Finding |
|---|----------|---------|
| A1 | **P0** | AI crawlers don't run JS → they currently see nothing useful. SSR HTML + JSON‑LD fixes this at the root. |
| A2 | **P1** | `robots.txt` doesn't address AI agents. Add explicit allow rules for `GPTBot`, `OAI‑SearchBot`, `ChatGPT‑User`, `ClaudeBot`, `Claude‑Web`, `PerplexityBot`, `Google‑Extended`, `Amazonbot`, `Bingbot`, and keep a clean, well‑structured sitemap they can consume. |

---

## 2. Canonical host recommendation

**Recommendation: `https://www.sabalist.com`.** Rationale: it is the host that already serves the correct Vercel build (valid XML sitemap, correct routing); your DNS notes already target "www‑only." Action items:

1. Edge **301** apex `sabalist.com/*` → `www.sabalist.com/*` (host‑level redirect in Vercel domain settings).
2. Set `BASE_URL`/`SITE_URL` = `https://www.sabalist.com` everywhere: `src/components/SEO.js`, `src/utils/seo.js`, `scripts/generate-sitemap.js`, `public/robots.txt`, and the new `seo-web` config.
3. Ensure `sabalist.web.app` / `*.firebaseapp.com` either 301 to www or serve `<meta name="robots" content="noindex">`.
4. Update Google Search Console: set `www.sabalist.com` as the primary property, submit the new sitemap index, and request validation.

> If you later prefer the bare apex for branding, the same plan applies in reverse — but apex must be fixed to serve the real build first.

---

## 3. Target architecture (Next.js SEO layer)

```
                         ┌─────────────────────────────────────────────┐
                         │            www.sabalist.com (edge)           │
                         │      Vercel rewrites / domain routing        │
                         └───────────────┬───────────────┬─────────────┘
        Indexable, SSR/ISR (Next.js)     │               │   Interactive app (existing Expo SPA)
        ┌────────────────────────────────▼───┐       ┌───▼─────────────────────────────┐
        │  /                                  │       │  /app/*  (or app.sabalist.com)  │
        │  /category/[cat]                    │       │  post listing, edit, auth,      │
        │  /category/[cat]/[sub]              │       │  favorites, chat, profile       │
        │  /[country]                         │       │  (no SEO requirements)          │
        │  /[country]/[city]                  │       └─────────────────────────────────┘
        │  /[country]/[city]/[cat]            │
        │  /listing/[id]                      │            Both read the SAME
        │  /guides/[slug]                     │        world-readable Firestore
        │  sitemap index + child sitemaps     │        `listings` collection.
        │  robots.ts                          │
        └─────────────────┬───────────────────┘
                          │ read-only Firebase Web SDK (public EXPO_PUBLIC_* config)
                          ▼
                 Firebase / Firestore  ──  Storage (images)
```

**Rendering strategy per page type**

| Page type | Strategy | Revalidate | Why |
|-----------|----------|-----------|-----|
| Home | ISR | 1 h | Fresh featured inventory, cheap to cache. |
| Category / Subcategory | ISR | 30–60 min | Inventory changes steadily; cache hard. |
| Country / City / City×Category | ISR | 1 h | Same; quality‑gate before indexing. |
| Listing detail | ISR + on‑demand revalidate | 24 h, revalidate on edit/sold | 45k+ pages; generate top/active at build, rest on first request; purge when a listing changes. |
| Guides | SSG | on deploy | Editorial, stable. |
| Sitemaps | Route handlers, cached | 1–6 h | Generated from Firestore + taxonomy + locations. |

**Why Next.js over the bridge options:** server components + `generateMetadata` + `generateStaticParams` + ISR + `next/image` give per‑route SSR, correct head tags, fast CWV, and a clean image pipeline in one framework — the genuinely "world‑class" target for a classifieds marketplace, and it future‑proofs localization (`hreflang`), edge caching, and on‑demand revalidation.

---

## 4. Information architecture & URL design

All lowercase, hyphenated, trailing‑slash‑free, canonical host www.

| Page | URL pattern | Indexable when |
|------|-------------|----------------|
| Home | `/` | always |
| Category | `/category/{category-id}` | always (15 top‑level) |
| Subcategory | `/category/{category-id}/{subcategory-id}` | ≥ N listings (recommend N=3) |
| Country hub | `/{country}` | country has ≥ N listings |
| City hub | `/{country}/{city}` | city has ≥ N listings |
| City × Category | `/{country}/{city}/{category-id}` | combo has ≥ N listings |
| Listing | `/listing/{firestoreId}` | status active/sold (sold → `SoldOut`, keep indexed a while) |
| Category index (hub) | `/categories` | always |
| Locations index (hub) | `/locations` | always |
| Guide | `/guides/{slug}` | always (editorial) |

**Quality gate (locked decision):** a category/location page renders for users always, but emits `<meta name="robots" content="noindex,follow">` and is **excluded from sitemaps** until it has ≥ N live listings. This prevents thin/doorway penalties while keeping the link graph crawlable. N is a single config constant (`INDEX_MIN_LISTINGS`).

**Taxonomy source of truth:** keep `src/config/categories.js` (15 categories, ~140 subcategories) and `src/config/cityRoutes.js` (`SEO_COUNTRIES` → cities) as the canonical data; the Next.js layer imports a typed port (`seo-web/src/lib/taxonomy.ts`, `locations.ts`) kept in sync with a small generator script.

---

## 5. Metadata system (per page type)

Implemented via Next.js `generateMetadata`. Templates (kept keyword‑rich but truthful):

- **Category:** `Buy & Sell {Category} in Africa | Sabalist` · *"Browse {count}+ {category} listings across Africa. Buy and sell {sub1}, {sub2}, {sub3} near you on Sabalist."*
- **Subcategory:** `{Subcategory} for Sale in Africa | Sabalist`
- **City hub:** `Buy & Sell in {City}, {Country} | Sabalist` · *"{count}+ free classifieds in {City}. {topCategories}."*
- **City × Category:** `{Category} for Sale in {City}, {Country} | Sabalist`
- **Listing:** `{Title} — {price} in {City} | Sabalist` · description from listing description (trimmed, cleaned), OG image = listing cover photo (1200×630 framed), `og:type=product`.
- Every page: self‑referencing `canonical` (www), `og:*`, `twitter:summary_large_image`, `robots` (index/noindex per gate).

---

## 6. Structured data plan (server‑rendered JSON‑LD)

| Page | Schema emitted |
|------|----------------|
| All pages | `Organization` (with `logo`, `sameAs` once socials exist) + `WebSite` + `SearchAction` (in root layout) |
| Category / Subcategory | `CollectionPage` + `BreadcrumbList` + `ItemList` (top 20) |
| City / City×Category | `CollectionPage` + `BreadcrumbList` + `ItemList` + `Place`/`City` (areaServed) + optional `FAQPage` |
| Listing | `Product` + `Offer`/`AggregateOffer` + `BreadcrumbList` + `ImageObject` + `availableAtOrFrom: Place` |
| Guides | `Article` + `BreadcrumbList` |

The existing generators in `src/utils/seo.js` are ported to `seo-web/src/lib/schema.ts` (typed) and extended with `CollectionPage`, `Place`, and `ImageObject`. Validate with Google Rich Results Test + schema.org validator in CI (see §8/§10).

---

## 7. Sitemaps (segmented index)

Replace the single monolith with a **sitemap index** + cached child sitemaps (Next.js route handlers, served from www):

```
/sitemap.xml                      → <sitemapindex> referencing:
/sitemaps/static.xml              → home, categories hub, locations hub, guides, about/terms/help
/sitemaps/categories.xml          → 15 categories + qualifying subcategories
/sitemaps/locations.xml           → qualifying countries, cities, city×category combos
/sitemaps/listings-{n}.xml        → active listings, ≤ 45k per file, paginated
/sitemaps/images-{n}.xml          → <image:image> for listing cover + gallery
```

Rules: only **indexable** URLs (pass the quality gate) appear; `<lastmod>` from `updatedAt`; `robots.txt` `Sitemap:` points to `https://www.sabalist.com/sitemap.xml`. The existing `scripts/generate-sitemap.js` is superseded by the route handlers (kept as a fallback for the SPA deploy during migration).

---

## 8. Robots & indexing controls

- **robots.txt** (new, host‑correct): allow public routes; disallow `/app/`, `/favorites`, `/my-listings`, `/profile`, `/edit-profile`, `/create`, `/auth`, `/notifications`, and all `*.html` debug files; explicit **allow** for AI agents (GPTBot, OAI‑SearchBot, ChatGPT‑User, ClaudeBot, Claude‑Web, PerplexityBot, Google‑Extended, Amazonbot, Bingbot); `Sitemap: https://www.sabalist.com/sitemap.xml`.
- **Remove debug HTML from production** (T4): delete from `public/` or stop copying into `dist/`, and drop their `vercel.json` routes.
- **Real 404s** (T5): the Next.js layer returns proper 404 status via `not-found.tsx`; for the SPA deploy, add a status‑404 fallback for unknown `/listing/` and `/category/` IDs.
- **Pagination** (I2): `/category/...?page=2` self‑canonical; page 1 canonical has no `page` param.
- **noindex below inventory threshold** (I3) on category/location pages.

---

## 9. AI‑search optimization

1. **SSR HTML + JSON‑LD** (root fix) — makes content legible to GPTBot/ClaudeBot/PerplexityBot/Bing.
2. **Explicit robots allowances** for AI agents (§8).
3. **Entity clarity:** strong `Organization` entity, consistent NAP‑style facts (what Sabalist is, where it operates), `sameAs` to socials once live.
4. **Answer‑shaped content:** city and category pages include a short, factual intro paragraph + an `FAQPage` ("How do I buy a used car in Nairobi safely?", "Is Sabalist free?") — the format AI answer engines quote.
5. **Guides** (§ content) written as clean, well‑structured, citable HTML with headings, lists, and schema — high‑value for AI retrieval.
6. **Freshness signals:** accurate `<lastmod>`, ISR revalidation, and "updated" dates on guides.

---

## 10. Content strategy (scalable landing pages)

| Type | Scale | Template |
|------|-------|----------|
| Category landing | 15 | Intro + live grid + subcategory links + top cities for this category + FAQ |
| Subcategory landing | ~140 (gated) | Same, narrower |
| Country guide | per active country | "Buying & selling in {Country}" + top cities + top categories + safety/FAQ |
| City landing | per active city | Live grid + categories in city + neighboring cities + FAQ |
| Buy/Sell guides | editorial set | "How to sell your car fast in Lagos", "Avoiding scams on classifieds", "Pricing your phone for resale" — `Article` schema |
| Marketplace guides | editorial set | "How Sabalist works", "Safety tips", "Why escrow/meetups" |

The existing **`Rovnic-Content-Calendar.md`** in the repo is a strong starting backlog — fold those topics into `/guides/*` with `Article` schema and internal links to the relevant category/city pages.

---

## 11. Reporting (SEO dashboard)

Delivered as `seo-dashboard.html` (see deliverables). It tracks: indexed pages, pages missing metadata, broken links, duplicate/thin pages, Core Web Vitals, sitemap status, schema validation, top keywords, organic‑opportunity backlog, and a ranked **priority‑fix** list. At launch it's populated from this audit; wire it to **Google Search Console API** + **PageSpeed Insights API** + a nightly crawl for live data (instructions in the dashboard footer and §12).

---

## 12. Prioritized roadmap

**Phase 0 — No‑regret fixes (do now, independent of Next.js):**
1. Standardize canonical host → www; 301 apex→www; fix `BASE_URL`/`SITE_URL` everywhere (T2/I1).
2. Point `robots.txt` `Sitemap:` at the working www host; add AI‑bot allows (A2).
3. Remove debug `*.html` from production + their routes (T4).
4. Upgrade `generate-sitemap.js` → sitemap index + subcategory + location + image children, quality‑gated (T3/M2) — *(shipped in this branch; see `scripts/`)*.
5. Add a 1200×630 default OG image; per‑listing OG = cover photo (O3).

**Phase 1 — Stand up the Next.js SEO layer (`/seo-web`):** home, category, subcategory, listing, city, city×category, guides; `generateMetadata`; server JSON‑LD; breadcrumbs; internal‑link blocks; robots + sitemap index; quality gate. Deploy to a preview, validate, then route indexable paths to it at the edge.

**Phase 2 — Migrate routing:** edge rules send `/`, `/category/*`, `/listing/*`, `/{country}/*`, `/guides/*` to Next.js; send app/interactive routes to the Expo SPA (`/app/*` or `app.sabalist.com`). Submit sitemap index in GSC; monitor coverage.

**Phase 3 — Content & scale:** publish guides, expand cities as inventory grows, add `hreflang` if localizing, wire the dashboard to GSC/PSI APIs, set up nightly crawl + schema validation in CI.

---

## 13. Risks & guardrails

- **Data freshness vs caching:** ISR revalidation + on‑demand purge on listing edit/sold (Firestore trigger → Next.js revalidate webhook).
- **Thin content:** the inventory quality gate (`INDEX_MIN_LISTINGS`) is the primary defense; never sitemap a gated page.
- **Duplicate hosts/mirrors:** 301 + canonical discipline (§2).
- **Two codebases:** keep taxonomy/locations as the single source of truth with a sync script so the SPA and Next.js never diverge.
- **Crawl budget:** segmented sitemaps + correct 404s + no debug pages keep budget on real inventory.

---

*Appendix A — files reviewed:* `package.json`, `vercel.json`, `firebase.json`, `amplify.yml`, `public/robots.txt`, `public/index.html`, `public/site.webmanifest`, `scripts/generate-sitemap.js`, `src/components/SEO.js`, `src/utils/seo.js`, `src/config/categories.js`, `src/config/cityRoutes.js`, `src/services/listings.web.js`, `src/lib/pricing.js`, `WEB_SEO_CHANGES_2026-06-15.md`, plus live fetches of `www`/apex `robots.txt`, `sitemap.xml`, `/`, `/category/vehicles`, and a 404 probe.
