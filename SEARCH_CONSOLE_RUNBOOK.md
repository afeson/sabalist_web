# Search Console & Indexing Runbook — Sabalist

Canonical host: **`https://www.sabalist.com`**. Do these in order once the apex→www 301 and the new sitemaps are deployed.

## 1. Google Search Console
1. Go to https://search.google.com/search-console and add a **Domain property** for `sabalist.com` (covers `www`, apex, and all subdomains in one).
   - Verify via DNS TXT (Hostinger DNS). *Alternatively*, a URL-prefix property for `https://www.sabalist.com` can be verified with the existing tokens already on the site: the `google-site-verification` meta (`W1etxg02tM4cfzhaWSiFNtzLYCvpNS3dSqoNY_Xptvg`) or the `public/google22ac299e2979bc6d.html` file.
2. Add **both** URL-prefix properties too: `https://www.sabalist.com` and `https://sabalist.com`. Keep them so you can confirm the apex shows the 301.
3. **Submit the sitemap:** in the `www` property → *Sitemaps* → add `sitemap-index.xml` (full URL `https://www.sabalist.com/sitemap-index.xml`). Optionally also add `sitemap.xml` (the hub).
4. **Verify the redirect:** in the apex property, *URL Inspection* on `https://sabalist.com/` should report a redirect to the `www` URL. Use *Change of Address* (apex property → Settings) to tell Google the apex moved to `www` if the apex was previously indexed.
5. **Prime priority pages:** *URL Inspection* → *Request indexing* for the homepage, top 5 category pages, and the top city pages with inventory (e.g. `/nigeria/lagos`, `/kenya/nairobi`). Don't bulk-request the long tail — the sitemap handles that.
6. **Monitor weekly:** *Pages* (index coverage) for "Discovered – not indexed" / "Crawled – not indexed" (usually thin pages → tighten `INDEX_MIN_LISTINGS`); *Sitemaps* for read errors; *Core Web Vitals* and *Mobile Usability*; *Performance* for the queries you're winning.

## 2. Bing Webmaster Tools
1. https://www.bing.com/webmasters — add `https://www.sabalist.com`. Fastest verification is **Import from Google Search Console**.
2. Submit `https://www.sabalist.com/sitemap-index.xml`.

## 3. IndexNow (instant indexing for Bing/Yandex)
1. Generate a random key (32+ hex chars). Set it as `INDEXNOW_KEY` in the Vercel project env.
2. Create `seo-web/public/<key>.txt` whose only content is that key string (so it's served at `https://www.sabalist.com/<key>.txt`).
3. Already wired: the revalidation webhook (`/api/revalidate`) pings IndexNow with every changed listing/category/location URL via `src/lib/indexnow.ts`. New and edited listings get pushed to Bing/Yandex within seconds — no further action.

## 4. After go-live checklist
- [ ] `https://sabalist.com/` returns **308 → https://www.sabalist.com/** (curl `-I`).
- [ ] `https://www.sabalist.com/sitemap-index.xml` returns XML listing the child sitemaps.
- [ ] `https://www.sabalist.com/robots.txt` shows `Sitemap: https://www.sabalist.com/sitemap-index.xml` and the AI-agent allows.
- [ ] View-source on a listing shows real `<title>`, meta description, canonical (`www`), and `Product` JSON-LD.
- [ ] Google **Rich Results Test** on a listing detects `Product`; on a category page detects `BreadcrumbList`/`ItemList`.
- [ ] Facebook **Sharing Debugger** + X **Card Validator** on a listing render the dynamic `/og/listing/{id}` card.
- [ ] `sabalist.web.app` either 301s to `www` or serves `noindex`.

## 5. AI search visibility (no console, but verify)
- `robots.txt` allows `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Bingbot`, etc.
- Spot-check by fetching a listing URL with no JS (e.g. `curl`) — the full content + JSON-LD must be present in the raw HTML (this is what AI crawlers read).
