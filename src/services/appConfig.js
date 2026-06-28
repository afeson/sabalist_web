/**
 * Marketplace config fetch + cache (NATIVE).
 *
 * Reads the single `marketplace_config/live` Firestore doc, applies it to the
 * runtime config layer, and caches it in AsyncStorage for instant offline
 * startup. Any failure leaves the bundled/cached config active — never throws.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, doc, getDoc } from '../lib/firebase';
import { applyConfig } from '../config/runtimeConfig';

const CACHE_KEY = '@sabalist:marketplaceConfig';
const CONFIG_DOC = ['marketplace_config', 'live'];

export async function loadCachedConfig() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    try { await AsyncStorage.removeItem(CACHE_KEY); } catch (_) {}
    return null;
  }
}

async function saveCachedConfig(cfg) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch (_) {}
}

export async function fetchConfigWithTimeout(ms = 2500) {
  const fetchDoc = (async () => {
    try {
      const snap = await getDoc(doc(firestore, CONFIG_DOC[0], CONFIG_DOC[1]));
      return snap && snap.exists() ? snap.data() : null;
    } catch (e) { return null; }
  })();
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([fetchDoc, timeout]);
}

/** Apply the cached config immediately (instant, offline-safe). */
export async function applyCachedConfig() {
  const cached = await loadCachedConfig();
  if (cached) return applyConfig(cached);
  return false;
}

/** Fetch fresh config from the server; apply + re-cache on success. */
export async function refreshMarketplaceConfig(timeoutMs = 2500) {
  const fresh = await fetchConfigWithTimeout(timeoutMs);
  if (fresh && applyConfig(fresh)) {
    await saveCachedConfig(fresh);
    return true;
  }
  return false;
}

/** Startup: apply cache instantly, then refresh from server. */
export async function fetchMarketplaceConfig() {
  await applyCachedConfig();
  await refreshMarketplaceConfig();
}
