// IndexNow: instantly notify Bing, Yandex, Seznam, etc. when URLs change.
// (Google ignores IndexNow but it's harmless.) Host a key file at
// `${SITE.url}/${INDEXNOW_KEY}.txt` containing exactly the key string — drop it
// in seo-web/public/. Set INDEXNOW_KEY in the project env.
import { SITE } from './site';

export async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;
  const host = new URL(SITE.url).host;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE.url}/${key}.txt`,
        urlList: urls.slice(0, 10000),
      }),
    });
  } catch {
    /* non-fatal */
  }
}
