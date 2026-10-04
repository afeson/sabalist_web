import { Platform } from 'react-native';

// Fire a GA4 event on web, where window.gtag is provided by public/index.html
// (property G-LGGRMQBGSD). No-op on native store apps. Never throws — analytics
// must never break a user flow.
export function track(event, params = {}) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch (_) {
    /* swallow — analytics is best-effort */
  }
}
