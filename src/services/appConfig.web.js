/**
 * Marketplace config fetch + cache (WEB).
 *
 * Web twin of appConfig.js — same surface, but Firestore comes from the web SDK
 * (`firebase.web` + `firebase/firestore`). AsyncStorage auto-polyfills to
 * localStorage on web. Any failure leaves the bundled/cached config active.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../lib/firebase.web';
import { doc, getDoc } from 'firebase/firestore';
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

export async function applyCachedConfig() {
  const cached = await loadCachedConfig();
  if (cached) return applyConfig(cached);
  return false;
}

export async function refreshMarketplaceConfig(timeoutMs = 2500) {
  const fresh = await fetchConfigWithTimeout(timeoutMs);
  if (fresh && applyConfig(fresh)) {
    await saveCachedConfig(fresh);
    return true;
  }
  return false;
}

export async function fetchMarketplaceConfig() {
  await applyCachedConfig();
  await refreshMarketplaceConfig();
}
