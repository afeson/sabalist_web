# Web SEO — changes (2026-06-15)

Scope: **web only**. No iOS/Android behavior changed. Native still shows AuthScreen
first; `allowPublicBrowsing` and all SEO code are gated to `Platform.OS === 'web'`.

## Changed in this pass
1. **Fixed structured-data domain bug** — `src/utils/seo.js`
   `BASE_URL` was `https://sabalist.web.app` (the Firebase mirror). Every JSON-LD
   URL (WebSite, BreadcrumbList, ItemList items, SearchAction) therefore pointed
   at the mirror while canonical/OG, robots.txt and sitemap.xml all use
   `https://sabalist.com`. Changed `BASE_URL` to `https://sabalist.com` so all
   ranking signals consolidate on one domain.
2. **Added Organization schema** — `src/utils/seo.js` (`generateOrganizationSchema`)
   and wired it into the homepage (`src/screens/HomeScreenSimple.js`) alongside the
   existing WebSite schema, to establish the Sabalist brand entity (name, url, logo).

## Already implemented in the repo (verified, no change needed)
- **Login wall removed on web**: `App.js` `allowPublicBrowsing = Platform.OS === 'web'`
  mounts the full marketplace navigator for logged-out web visitors; native unchanged.
- **Auth still required** for create / edit / favorites / my-listings / profile /
  notifications via `withAuthGate` in `src/navigation/MainTabNavigator.js`. These
  screens also render `<SEO noIndex />`.
- **SEO metadata**: `src/components/SEO.js` (Helmet) used on all screens with
  per-page title/description/canonical/OG/Twitter. `HelmetProvider` mounted (web).
- **Structured data**: Product+Offer (listings), BreadcrumbList, ItemList
  (category/city), FAQPage (city) via `src/utils/seo.js`.
- **robots.txt**: `public/robots.txt` allows public routes, disallows private ones,
  references the sitemap.
- **sitemap**: `scripts/generate-sitemap.js` builds `public/sitemap.xml` at build
  time from static pages + categories + active Firestore listings (non-fatal on error).
- **Routing**: `vercel.json` serves robots.txt/sitemap.xml/static directly and falls
  back all other paths to `/index.html` (SPA) so deep links like `/listing/:id` and
  `/category/:id` resolve and are crawlable.

## To deploy a PREVIEW (gets a unique URL, does NOT touch production)
From the project root, with the Vercel CLI authenticated to the `afrilist-mvp` project:

```bash
# Option A — deploy current working tree to a preview URL
npx vercel deploy            # preview (omit --prod); prints a https://afrilist-mvp-*.vercel.app URL

# Option B — git-based preview (if the Vercel git integration is connected)
git checkout -b seo-public-web
git add -A && git commit -m "web SEO: fix JSON-LD domain, add Organization schema"
git push -u origin seo-public-web   # Vercel auto-builds a preview for the branch
```

Then verify on the preview URL before promoting to production:
- `/<preview>/robots.txt` returns text/plain (not the app shell)
- `/<preview>/sitemap.xml` returns XML with category + listing URLs
- View-source a listing page → `<title>`, meta description, canonical, and
  `Product` JSON-LD present; canonical host is `sabalist.com`
- Google Rich Results Test on a listing URL detects `Product`
- Promote to production only after these pass.

> Build note: the `vercel-build` script uses `expo export:web` (legacy webpack web
> export via `@expo/webpack-config`). Confirm the build still succeeds on Expo SDK 54;
> if it errors, the modern equivalent is `npx expo export -p web` (outputs to `dist`).
