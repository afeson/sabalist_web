/**
 * In-App Review Service
 * ----------------------
 * Shows the NATIVE rating prompt (iOS SKStoreReviewController via Apple, and the
 * Android In-App Review API via Google Play) using expo-store-review.
 *
 * Policy (per product spec):
 *   The prompt becomes eligible after ANY of these milestones:
 *     1. The user posts a listing            -> recordListingPosted()
 *     2. The user completes 3 app sessions    -> registerSession()  (threshold)
 *     3. The user favorites 5 listings        -> recordFavoriteAdded() (threshold)
 *   And it is NEVER requested more than once every 90 days (MIN_DAYS_BETWEEN_PROMPTS).
 *
 *   "OR" semantics are used (any single milestone qualifies) because the three
 *   events happen at different times. To require ALL three instead, change
 *   POLICY.mode to 'all' (see isEligible()).
 *
 * Platform: native only. On web every function is a safe no-op so the web bundle
 * never loads the native module (mirrors favoritesService's native/web split).
 *
 * Note: the OS itself also rate-limits the prompt (iOS shows it at most a few
 * times per year and may not show it at all). We record the timestamp whenever
 * we *request* a review, so our 90-day cap holds regardless of whether the OS
 * actually rendered the dialog.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POLICY = {
  mode: 'any',            // 'any' = any milestone qualifies; 'all' = require all three
  sessionThreshold: 3,
  favoriteThreshold: 5,
  minDaysBetweenPrompts: 90,
};

const KEYS = {
  sessions: 'review.sessionCount',
  favorites: 'review.favoriteCount',
  posted: 'review.hasPostedListing',
  lastPrompt: 'review.lastPromptAt',
};

const isWeb = Platform.OS === 'web';

// Lazy-load the native module so it never enters the web bundle.
let _storeReview;
function storeReview() {
  if (!_storeReview) _storeReview = require('expo-store-review');
  return _storeReview;
}

async function getNum(key) {
  const v = await AsyncStorage.getItem(key);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

async function inCooldown() {
  const last = await AsyncStorage.getItem(KEYS.lastPrompt);
  if (!last) return false;
  const days = (Date.now() - Number(last)) / 86_400_000;
  return days < POLICY.minDaysBetweenPrompts;
}

async function isEligible() {
  const [sessions, favorites, posted] = await Promise.all([
    getNum(KEYS.sessions),
    getNum(KEYS.favorites),
    AsyncStorage.getItem(KEYS.posted),
  ]);
  const hitPosted = posted === '1';
  const hitSessions = sessions >= POLICY.sessionThreshold;
  const hitFavorites = favorites >= POLICY.favoriteThreshold;

  return POLICY.mode === 'all'
    ? hitPosted && hitSessions && hitFavorites
    : hitPosted || hitSessions || hitFavorites;
}

/**
 * Request the native review prompt if the user is eligible and outside the
 * 90-day cooldown. Returns true if a request was made.
 */
async function maybeRequestReview(reason) {
  if (isWeb) return false;
  try {
    if (!(await isEligible())) return false;
    if (await inCooldown()) return false;

    const SR = storeReview();
    const available = (await SR.isAvailableAsync()) && (await SR.hasAction());
    if (!available) return false;

    await SR.requestReview();
    await AsyncStorage.setItem(KEYS.lastPrompt, String(Date.now()));
    if (__DEV__) console.log(`[review] requested (reason: ${reason})`);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[review] request failed:', e?.message);
    return false;
  }
}

/** Count one app session (call once per app launch). May trigger the prompt. */
export async function registerSession() {
  if (isWeb) return;
  try {
    const n = (await getNum(KEYS.sessions)) + 1;
    await AsyncStorage.setItem(KEYS.sessions, String(n));
    if (n >= POLICY.sessionThreshold) await maybeRequestReview('sessions');
  } catch (e) {
    if (__DEV__) console.warn('[review] registerSession failed:', e?.message);
  }
}

/** Call after a listing is successfully posted. May trigger the prompt. */
export async function recordListingPosted() {
  if (isWeb) return;
  try {
    await AsyncStorage.setItem(KEYS.posted, '1');
    await maybeRequestReview('posted_listing');
  } catch (e) {
    if (__DEV__) console.warn('[review] recordListingPosted failed:', e?.message);
  }
}

/** Call after a listing is successfully favorited. May trigger the prompt. */
export async function recordFavoriteAdded() {
  if (isWeb) return;
  try {
    const n = (await getNum(KEYS.favorites)) + 1;
    await AsyncStorage.setItem(KEYS.favorites, String(n));
    if (n >= POLICY.favoriteThreshold) await maybeRequestReview('favorites');
  } catch (e) {
    if (__DEV__) console.warn('[review] recordFavoriteAdded failed:', e?.message);
  }
}

export default { registerSession, recordListingPosted, recordFavoriteAdded };
