import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import { COLORS } from '../theme';

/**
 * Gates a screen behind authentication.
 *
 * IMPORTANT — mobile is intentionally a no-op:
 * On native (iOS/Android) App.js still renders <AuthScreen /> for logged-out
 * users, so any screen reached through the navigator already has a signed-in
 * user. This guard therefore short-circuits to `children` on native and only
 * does real work on web, where logged-out visitors are now allowed to browse
 * public marketplace screens (the SEO fix) but must sign in for private
 * actions (create/edit/delete listing, favorites, my listings, account).
 */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (Platform.OS !== 'web') return children;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  return children;
}

/**
 * HOC form for use as a navigator `component={...}`. Wrap once at module scope
 * so the guarded component identity stays stable across renders (defining it
 * inline in render would remount the screen on every parent render).
 */
export function withAuthGate(Component) {
  return function Guarded(props) {
    return (
      <RequireAuth>
        <Component {...props} />
      </RequireAuth>
    );
  };
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
