import { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { auth } from './src/lib/firebase';
import PhoneOTPScreen from './src/screens/PhoneOTPScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { COLORS } from './src/theme';
import './src/lib/i18n';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Setting up auth state listener...');

    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      if (currentUser) {
        console.log('✅ Auth state: USER SIGNED IN');
        console.log('   User ID:', currentUser.uid);
        console.log('   Phone:', currentUser.phoneNumber);
      } else {
        console.log('🚪 Auth state: USER SIGNED OUT (or not signed in)');
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      console.log('🔥 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Sabalist...</Text>
      </View>
    );
  }

  return user ? (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  ) : (
    <PhoneOTPScreen />
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
});
