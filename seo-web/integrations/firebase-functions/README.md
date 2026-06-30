# Firestore → SEO revalidation bridge

A Cloud Function that POSTs to the Next.js `/api/revalidate` webhook whenever a
`listings/{id}` doc changes, so SEO pages update instantly.

## Wire it up
1. In the Next.js (Vercel) project, set `REVALIDATE_SECRET` to a long random string.
2. Add a `functions` block to the repo's `firebase.json`:
   ```json
   "functions": { "source": "seo-web/integrations/firebase-functions" }
   ```
3. Configure the function:
   ```bash
   firebase functions:secrets:set SEO_REVALIDATE_SECRET   # paste the same secret
   # set the URL (functions env or .env in this folder):
   echo "SEO_REVALIDATE_URL=https://www.sabalist.com/api/revalidate" > .env
   ```
4. Deploy:
   ```bash
   firebase deploy --only functions:revalidateOnListingWrite
   ```

## No-Functions alternative
Any backend (or the app's own write path) can call the webhook directly:
```bash
curl -X POST https://www.sabalist.com/api/revalidate \
  -H "x-revalidate-secret: $SECRET" -H "content-type: application/json" \
  -d '{"type":"listing","id":"ABC123","categoryId":"vehicles","location":"Lagos, Nigeria"}'
```
