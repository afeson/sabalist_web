# public/

Static assets served at the site root.

## Required
- `og/default-1200x630.png` — fallback social card (referenced by `SITE.defaultOgImage`). Add a branded 1200×630 PNG.
- `<INDEXNOW_KEY>.txt` — IndexNow key file. Create a random key, set it as `INDEXNOW_KEY` in env, and save a file named `<that-key>.txt` here whose only contents are the key string. Example: key `a1b2c3...` → file `public/a1b2c3....txt` containing `a1b2c3...`.
- Copy `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`, `web-app-manifest-512x512.png` from the app's `../public/` so icons/manifest resolve.
