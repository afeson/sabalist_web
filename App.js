import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { COLORS } from './src/theme';
import { registerSession } from './src/services/reviewService';

// SEO: HelmetProvider for web only
const HelmetProvider = Platform.OS === 'web'
  ? require('react-helmet-async').HelmetProvider
  : ({ children }) => children;

// Lazy load i18n to prevent startup crash
let i18nInitialized = false;
const initializeI18n = async () => {
  if (!i18nInitialized) {
    try {
      await import('./src/lib/i18n');
      i18nInitialized = true;
      console.log('✅ i18n initialized');
    } catch (error) {
      console.error('❌ i18n initialization error:', error);
    }
  }
};

// Linking configuration for deep links and SEO-friendly URLs.
//
// The `screens` map MUST mirror the actual navigator hierarchy. The root
// navigator rendered below is MainTabNavigator (a stack whose first screen is
// the "MainTabs" tab navigator), so these screens live at the TOP level — not
// nested under a non-existent "Main"/"Auth" wrapper. The previous nesting meant
// URLs like /listing/:id and /category/:id never resolved, which (together with
// the login wall) is why crawlers couldn't index marketplace content.
const linking = {
  prefixes: [
    'sabalist://',
    'https://sabalist.com',
    'https://www.sabalist.com',
    'https://sabalist.web.app',
    'https://sabalist.firebaseapp.com',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: '',
          Favorites: 'favorites',
          CreateListing: 'create',
          MyListings: 'my-listings',
          Profile: 'profile',
        },
      },
      ListingDetail: 'listing/:listingId',
      SubCategories: 'category/:category',
      CategoryListings: 'category/:category/:subcategoryId',
      About: 'about',
      TermsPrivacy: 'terms',
      HelpSupport: 'help',
      Notifications: 'notifications',
      EditProfile: 'edit-profile',
      CityListings: ':country/:city/:category',
    },
  },
};

// Error Fallback Component
function ErrorFallback({ error }) {
  return (
    <View style={[styles.container, styles.centerContent]}>
      <Text style={styles.errorTitle}>❌ App Error</Text>
      <Text style={styles.errorText}>{error?.message || 'Unknown error'}</Text>
      <Text style={styles.errorHint}>Please restart the app</Text>
    </View>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [appReady, setAppReady] = useState(false);

  // Initialize app on mount
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 APP_INIT: Starting app initialization...');

        // Initialize i18n
        await initializeI18n();

        // Count this app launch as a session for the in-app review policy
        // (native only; no-ops on web). May trigger the native rating prompt
        // once the user has completed 3 sessions, subject to the 90-day cap.
        registerSession();

        // Add small delay to ensure all modules are loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        if (mounted) {
          setAppReady(true);
          console.log('✅ APP_INIT: App ready');
        }
      } catch (error) {
        console.error('❌ APP_INIT: Initialization error:', error);
        if (mounted) {
          setAppReady(true); // Show app anyway to display error
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Hide scrollbar on web only
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide scrollbar for Chrome, Safari and Opera */
        body::-webkit-scrollbar,
        #root::-webkit-scrollbar,
        *::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        body,
        #root,
        * {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Ensure scrolling still works */
        body, #root {
          overflow-y: auto;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Show startup loading screen
  if (!appReady || loading) {
    console.log('APP_LOADING: appReady =', appReady, ', loading =', loading);
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{appReady ? t('loadingApp') : 'Starting Sabalist...'}</Text>
        <Text style={styles.loadingSubtext}>
          {!appReady ? 'Initializing...' : loading ? 'Checking authentication...' : ''}
        </Text>
      </View>
    );
  }

  console.log('APP_RENDER: Rendering with user =', user ? 'AUTHENTICATED' : 'NULL');

  // Single NavigationContainer wraps BOTH authenticated and unauthenticated states
  // This fixes "Couldn't find a navigation object" error on web
  //
  // SEO fix (web only): logged-out visitors and search-engine crawlers are
  // allowed to mount the full marketplace navigator so public pages (home,
  // categories, search, listing detail) render and are indexable. Private
  // actions stay protected by <RequireAuth> wrappers inside MainTabNavigator.
  //
  // Native (iOS/Android) behavior is intentionally UNCHANGED: logged-out users
  // still see <AuthScreen /> first, so the mobile apps work exactly as before
  // and no new build is required.
  const allowPublicBrowsing = Platform.OS === 'web';

  return (
    <HelmetProvider>
      {/* documentTitle disabled so React Navigation doesn't overwrite the
          per-page <title> set by the SEO/Helmet component on web (otherwise
          every page is titled by its route name, e.g. "Home"). No native
          effect — documentTitle only applies on web. */}
      <NavigationContainer
        linking={linking}
        documentTitle={{ enabled: false }}
      >
        {user || allowPublicBrowsing ? <MainTabNavigator /> : <AuthScreen />}
      </NavigationContainer>
    </HelmetProvider>
  );
}

// Error Boundary Wrapper
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ APP_ERROR_BOUNDARY:', error);
    console.error('❌ ERROR_INFO:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('NATIVE BUILD v1.2.8 LOADED');
  console.log('APP: Component mounting - React is running!');
  console.log('APP: Timestamp:', new Date().toISOString());

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    opacity: 0.7,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.error || '#E50914',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  errorHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    opacity: 0.6,
    marginTop: 8,
  },
});
