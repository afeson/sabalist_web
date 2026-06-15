# Sabalist — Store Submission Checklist (App Store Connect + Google Play Console)

Use with the paste-ready copy in `Sabalist-ASO-Package.md` (titles, subtitle,
keywords, descriptions) and `STORE_SCREENSHOT_CAPTIONS.md`.

Legend: ☐ = to do. "Paste:" = exact field to paste into.

---

## A. Apple — App Store Connect  (app id 6759536317, bundle com.sabalist.app)

### App information (App Information tab)
- ☐ **Name** — Paste into *App Information → Name*: `Sabalist: Buy & Sell Local`
- ☐ **Subtitle** — Paste into *(version) → Subtitle*: `Marketplace for Jobs & Cars`
- ☐ **Primary Category** — set to **Shopping** (change from Business)
- ☐ **Secondary Category** — set to **Lifestyle**
- ☐ **Privacy Policy URL** — set one consistent URL: `https://sabalist.com/privacy`

### Version metadata (the "Prepare for Submission" version)
- ☐ **Keywords** — Paste into *Keywords*: `classifieds,listings,real,estate,rentals,services,property,rent,used,vehicles,phones,shop,global`
- ☐ **Promotional Text** (optional, updatable anytime) — short value line
- ☐ **Description** — Paste your marketplace description (see ASO package full description; iOS version may reuse the Play full description)
- ☐ **Support URL** — `https://sabalist.com` (or a real support page)
- ☐ **Marketing URL** (optional) — `https://sabalist.com`

### Visuals
- ☐ Upload **6.7" + 6.5"** screenshots (and 12.9" iPad if iPad-enabled) with captions from `STORE_SCREENSHOT_CAPTIONS.md`
- ☐ Add **App Preview video** (15–30s) — optional but lifts conversion
- ☐ Replace any placeholder app-icon/screenshot artwork

### Build & review
- ☐ Upload a build that includes **expo-store-review** (after `npx expo install` + native build)
- ☐ **Age rating** — confirm questionnaire (currently 13+)
- ☐ **App Privacy** — confirm data types (Location, Contact Info, User Content, Identifiers, Usage)
- ☐ Sign-in info for reviewers if any gated features
- ☐ Submit for review

---

## B. Google — Play Console  (package com.sabalist.app)

### Main store listing (Grow → Store presence → Main store listing)
- ☐ **App name** — Paste: `Sabalist: Buy, Sell & Jobs`
- ☐ **Short description** — Paste: `Marketplace to buy & sell cars, real estate, jobs, rentals & services`
- ☐ **Full description** — Paste the full description from `Sabalist-ASO-Package.md`
- ☐ **App category** — keep **Shopping**
- ☐ **Developer name consistency** — align with Apple ("Sabalist" / one brand; reconcile "oplixi" vs "Afeson abebe")
- ☐ **Contact email / privacy policy** — `https://sabalist.com/privacy`

### Graphics
- ☐ **App icon** 512×512
- ☐ **Feature graphic** 1024×500 (text from captions doc)
- ☐ **Phone screenshots** ×2–8 with captions
- ☐ (Optional) **Promo video** (YouTube URL)

### Release & policy
- ☐ Upload **AAB** from Codemagic (android-release workflow → internal track)
- ☐ Complete **Data safety** form (Location, Personal info, etc.)
- ☐ Complete **Content rating** questionnaire
- ☐ Set **Target audience** and **Ads** declarations
- ☐ Promote internal → closed/open testing → production

---

## C. Cross-store consistency (do before submitting either)
- ☐ Same **brand name** and developer identity on both stores
- ☐ Same **category** (Shopping)
- ☐ One **privacy policy URL** (`https://sabalist.com/privacy`) everywhere
- ☐ No competitor brand names in Apple keyword field (policy)
- ☐ Screenshots reflect the **live** app and real local listings

## D. After approval
- ☐ Turn on in-app review prompts (already implemented; ships in the new build)
- ☐ Seed first 50–100 ratings via the in-app prompt
- ☐ Submit `https://sabalist.com/sitemap.xml` in Google Search Console (web SEO)
- ☐ Localize listing (French first)
