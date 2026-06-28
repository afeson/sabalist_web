/**
 * ConfigContext — lightweight re-render trigger for backend-driven config.
 *
 * The actual config lives in runtimeConfig (read via getters); this context only
 * exposes a `version` counter that bumps when a periodic refresh applies new
 * config, so dynamic surfaces (home screen, nav chips, banners) re-render.
 *
 * Periodic refresh runs here: on an interval and when the app/tab returns to the
 * foreground. Startup hydration happens earlier in App.js (before first render).
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getConfigVersion } from '../config/runtimeConfig';

const { refreshMarketplaceConfig } = Platform.OS === 'web'
  ? require('../services/appConfig.web')
  : require('../services/appConfig');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 min

const ConfigContext = createContext(0);

export function ConfigProvider({ children }) {
  const [version, setVersion] = useState(getConfigVersion());
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    let mounted = true;
    const sync = () => { if (mounted) setVersion(getConfigVersion()); };

    const refresh = async () => {
      try {
        await refreshMarketplaceConfig();
        lastRefresh.current = Date.now();
        sync();
      } catch (_) {}
    };

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

    // Refresh when returning to the foreground (but not more than ~every 5 min).
    const onForeground = () => {
      if (Date.now() - lastRefresh.current > 5 * 60 * 1000) refresh();
    };
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') onForeground();
    });
    let onVis;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVis = () => { if (document.visibilityState === 'visible') onForeground(); };
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      mounted = false;
      clearInterval(interval);
      appStateSub?.remove?.();
      if (onVis && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <ConfigContext.Provider value={version}>{children}</ConfigContext.Provider>;
}

/** Subscribe a component to config refreshes (returns the current version). */
export function useConfigVersion() {
  return useContext(ConfigContext);
}
