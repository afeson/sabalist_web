import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';

// Platform-specific Firebase imports with lazy loading
let auth, onAuthStateChanged, signOut;
let firebaseLoaded = false;

const loadFirebase = () => {
  if (firebaseLoaded) return true;

  try {
    console.log('🔥 AUTH_CONTEXT: Loading Firebase modules...');

    if (Platform.OS === 'web') {
      // Web: Use Firebase Web SDK
      const { auth: webAuth } = require('../lib/firebase.web');
      const firebaseAuth = require('firebase/auth');
      auth = webAuth;
      onAuthStateChanged = firebaseAuth.onAuthStateChanged;
      signOut = firebaseAuth.signOut;
    } else {
      // Native: Use React Native Firebase
      const { auth: nativeAuth } = require('../lib/firebase');
      auth = nativeAuth;
      // For native, auth is a module - we'll use auth().onAuthStateChanged
    }

    firebaseLoaded = true;
    console.log('✅ AUTH_CONTEXT: Firebase modules loaded');
    return true;
  } catch (error) {
    console.error('❌ AUTH_CONTEXT: Firebase load error:', error);
    return false;
  }
};

const AuthContext = createContext({});

// DEV-ONLY: Fake user for development bypass
const DEV_USER = {
  uid: 'dev-user-12345',
  email: 'dev@sabalist.app',
  displayName: 'Dev User',
  emailVerified: true,
  phoneNumber: null,
  photoURL: null,
  // Add any other properties your app expects
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
        console.log('AUTH_CONTEXT: Setting up auth listener');
        console.log('AUTH_CONTEXT: Platform =', Platform.OS);

        // DEV-ONLY: Bypass authentication in development
        // DISABLED FOR PRODUCTION - Only enable locally for testing
        // Expo production builds set __DEV__ = false automatically
        if (__DEV__ && Platform.OS !== 'web') {
          console.log('🚀 DEV MODE: Bypassing authentication with fake user');
          console.log('   Fake user:', DEV_USER.email);

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500));

          if (mounted) {
            setUser(DEV_USER);
            setLoading(false);
          }

          console.log('✅ DEV MODE: Fake user authenticated');
          return; // Skip Firebase setup in dev mode
        }

        // PRODUCTION: Normal Firebase auth flow
        console.log('🔒 PRODUCTION MODE: Using Firebase authentication');

        // Load Firebase modules
        const loaded = loadFirebase();
        if (!loaded) {
          throw new Error('Failed to load Firebase modules');
        }

        // Small delay to ensure Firebase is fully initialized on Android
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!mounted) return;

        // Set up auth listener
        if (Platform.OS === 'web') {
          // Web listener
          unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!mounted) return;
            console.log('AUTH_CONTEXT: Web auth state changed');
            console.log('AUTH_CONTEXT: User =', currentUser ? currentUser.email || currentUser.phoneNumber : 'NULL');
            setUser(currentUser);
            setLoading(false);
          });
        } else {
          // Native listener
          unsubscribe = auth().onAuthStateChanged((currentUser) => {
            if (!mounted) return;
            console.log('AUTH_CONTEXT: Native auth state changed');
            console.log('AUTH_CONTEXT: User =', currentUser ? currentUser.email || currentUser.phoneNumber : 'NULL');
            setUser(currentUser);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error('❌ AUTH_CONTEXT: Setup error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      console.log('AUTH_CONTEXT: Cleaning up listener');
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error('AUTH_CONTEXT: Error cleaning up listener:', err);
        }
      }
    };
  }, []);

  const logout = async () => {
    try {
      console.log('LOGOUT: START');
      console.log('LOGOUT: Platform =', Platform.OS);

      // DEV-ONLY: Handle logout in dev mode
      // DISABLED FOR PRODUCTION - Only enable locally for testing
      if (__DEV__ && Platform.OS !== 'web') {
        console.log('🚀 DEV MODE: Simulating logout');
        setUser(null);
        console.log('✅ DEV MODE: User logged out');
        return true;
      }

      // PRODUCTION: Normal Firebase logout
      if (!firebaseLoaded) {
        throw new Error('Firebase not loaded');
      }

      const currentUser = Platform.OS === 'web' ? auth.currentUser : auth().currentUser;
      console.log('LOGOUT: User before =', currentUser?.email || currentUser?.phoneNumber || 'NONE');

      if (Platform.OS === 'web') {
        await signOut(auth);
        console.log('LOGOUT: Web signOut completed');
      } else {
        await auth().signOut();
        console.log('LOGOUT: Native signOut completed');
      }

      const afterUser = Platform.OS === 'web' ? auth.currentUser : auth().currentUser;
      console.log('LOGOUT: User after =', afterUser?.email || afterUser?.phoneNumber || 'NONE');
      console.log('LOGOUT: DONE - auth listener will update user state');

      // User state will be updated by onAuthStateChanged listener
      return true;
    } catch (err) {
      console.error('LOGOUT: ERROR', err);
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
