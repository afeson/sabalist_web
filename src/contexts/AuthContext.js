import { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';

// Direct imports for web (webpack will tree-shake native imports)
import { auth as webAuth } from '../lib/firebase.web';
import { onAuthStateChanged as webOnAuthStateChanged, signOut as webSignOut } from 'firebase/auth';

// We'll dynamically require native Firebase only on native platforms
let nativeAuth;

const AuthContext = createContext({});

// DEV-ONLY: Fake user for development bypass
const DEV_USER = {
  uid: 'dev-user-12345',
  email: 'dev@sabalist.app',
  displayName: 'Dev User',
  emailVerified: true,
  phoneNumber: null,
  photoURL: null,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe;

    const setupAuth = async () => {
      try {
        console.log('🔥 AUTH_CONTEXT: Setting up auth listener');
        console.log('🔥 AUTH_CONTEXT: Platform =', Platform.OS);

        // DEV-ONLY: Bypass authentication in development (native only)
        if (__DEV__ && Platform.OS !== 'web') {
          console.log('🚀 DEV MODE: Bypassing authentication with fake user');
          await new Promise(resolve => setTimeout(resolve, 500));

          if (mounted) {
            setUser(DEV_USER);
            setLoading(false);
          }
          console.log('✅ DEV MODE: Fake user authenticated');
          return;
        }

        // PRODUCTION: Normal Firebase auth flow
        console.log('🔒 PRODUCTION MODE: Using Firebase authentication');

        if (!mounted) return;

        // Local flag to track if auth listener has resolved (Safari fix)
        let resolved = false;

        // Set up auth listener based on platform
        if (Platform.OS === 'web') {
          console.log('🔥 AUTH_CONTEXT: Setting up WEB auth listener');

          unsubscribe = webOnAuthStateChanged(webAuth, (currentUser) => {
            if (!mounted) return;
            resolved = true;
            console.log('✅ AUTH_CONTEXT: Web auth state changed');
            console.log('   User =', currentUser ? currentUser.email || currentUser.uid : 'NULL');
            setUser(currentUser ?? null);
            setLoading(false);
          });
        } else {
          console.log('🔥 AUTH_CONTEXT: Setting up NATIVE auth listener');
          if (!nativeAuth) {
            nativeAuth = require('../lib/firebase').auth;
          }
          unsubscribe = nativeAuth().onAuthStateChanged((currentUser) => {
            if (!mounted) return;
            resolved = true;
            console.log('✅ AUTH_CONTEXT: Native auth state changed');
            console.log('   User =', currentUser ? currentUser.email || currentUser.uid : 'NULL');
            setUser(currentUser ?? null);
            setLoading(false);
          });
        }

        console.log('🔥 AUTH_CONTEXT: Auth listener registered, waiting for callback...');

        // Safety timeout: If auth listener doesn't fire within 3 seconds, assume no user (Safari fix)
        setTimeout(() => {
          if (!resolved && mounted) {
            console.warn('⚠️ AUTH_CONTEXT: Auth listener timeout - continuing without user (Safari fallback)');
            setUser(null);
            setLoading(false);
          }
        }, 3000);
      } catch (err) {
        console.error('❌ AUTH_CONTEXT: Setup error:', err);
        console.error('❌ AUTH_CONTEXT: Error details:', err.message, err.stack);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      console.log('🔥 AUTH_CONTEXT: Cleaning up listener');
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error('❌ AUTH_CONTEXT: Error cleaning up listener:', err);
        }
      }
    };
  }, []);

  const logout = async () => {
    try {
      console.log('🔥 LOGOUT: START');
      console.log('🔥 LOGOUT: Platform =', Platform.OS);

      // DEV-ONLY: Handle logout in dev mode (native only)
      if (__DEV__ && Platform.OS !== 'web') {
        console.log('🚀 DEV MODE: Simulating logout');
        setUser(null);
        console.log('✅ DEV MODE: User logged out');
        return true;
      }

      // PRODUCTION: Normal Firebase logout
      if (Platform.OS === 'web') {
        await webSignOut(webAuth);
        console.log('✅ LOGOUT: Web signOut completed');
      } else {
        if (!nativeAuth) {
          nativeAuth = require('../lib/firebase').auth;
        }
        await nativeAuth().signOut();
        console.log('✅ LOGOUT: Native signOut completed');
      }

      console.log('✅ LOGOUT: DONE - auth listener will update user state');
      return true;
    } catch (err) {
      console.error('❌ LOGOUT: ERROR', err);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
