import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-aware Firebase imports
let auth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithPopup;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  const firebaseAuth = require('firebase/auth');
  auth = firebaseWeb.auth;
  sendSignInLinkToEmail = firebaseAuth.sendSignInLinkToEmail;
  isSignInWithEmailLink = firebaseAuth.isSignInWithEmailLink;
  signInWithEmailLink = firebaseAuth.signInWithEmailLink;
  GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
  signInWithPopup = firebaseAuth.signInWithPopup;
} else {
  // Native (Android/iOS) - @react-native-firebase
  const firebaseNative = require('../lib/firebase');
  auth = firebaseNative.auth;
  // These methods exist on the auth() instance for native
}

import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';
import Input from '../components/Input';

export default function AuthScreen() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [, forceUpdate] = useState(0);

  // Force re-render when language changes (even if screen is already focused)
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  // Also re-render when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  // Handle incoming email link when user clicks it
  useEffect(() => {
    console.log('🎯 AuthScreen mounted - setting up deep link listeners');

    const handleDynamicLink = async (url) => {
      console.log('🔔 handleDynamicLink called with URL:', url ? 'YES' : 'NO');

      if (!url) {
        console.log('⚠️ No URL provided to handleDynamicLink');
        return;
      }

      console.log('🔗 Received URL:', url);
      console.log('   URL length:', url.length);
      console.log('   URL type:', typeof url);

      try {
        let firebaseAuthUrl = url;

        // Firebase auth links come in as HTTPS URLs directly when using proper intent filters
        // Example: https://sabalist.firebaseapp.com/__/auth/action?mode=signIn&oobCode=...

        console.log('🔧 Processing incoming URL');
        console.log('   Raw URL:', url);

        // URL is already in the correct HTTPS format from Android intent filter
        // No conversion needed - Firebase will validate it directly
        if (url.startsWith('https://')) {
          console.log('✅ Received HTTPS URL (expected for auth links)');
          firebaseAuthUrl = url;
        }
        // Handle custom scheme (fallback - shouldn't happen for email auth)
        else if (url.startsWith('sabalist://')) {
          console.log('⚠️ Received custom scheme URL (unexpected for email auth)');
          // Extract query parameters and construct HTTPS URL
          const urlParts = url.split('?');
          if (urlParts.length > 1) {
            firebaseAuthUrl = `https://sabalist.firebaseapp.com/__/auth/action?${urlParts[1]}`;
            console.log('🔄 Converted to HTTPS:', firebaseAuthUrl);
          }
        }
        else {
          console.log('⚠️ Unexpected URL format');
        }

        console.log('🔍 Validating Firebase email link...');
        console.log('   Final URL:', firebaseAuthUrl);

        let isValid;

        if (Platform.OS === 'web') {
          // Web: Use Firebase Web SDK
          isValid = isSignInWithEmailLink(auth, firebaseAuthUrl);
        } else {
          // Native: Use React Native Firebase
          isValid = auth().isSignInWithEmailLink(firebaseAuthUrl);
        }

        console.log('🔍 Is valid email link:', isValid);

        if (!isValid) {
          console.log('❌ URL is not a valid Firebase email sign-in link');
          console.log('   Validation failed for:', firebaseAuthUrl);

          // Debug: Parse and show URL components
          try {
            const testUrl = new URL(firebaseAuthUrl);
            console.log('   URL components:');
            console.log('     - Protocol:', testUrl.protocol);
            console.log('     - Host:', testUrl.host);
            console.log('     - Pathname:', testUrl.pathname);
            console.log('     - Has apiKey:', testUrl.searchParams.has('apiKey'));
            console.log('     - Has mode:', testUrl.searchParams.has('mode'));
            console.log('     - Has oobCode:', testUrl.searchParams.has('oobCode'));
          } catch (parseError) {
            console.log('   Could not parse URL:', parseError.message);
          }

          return;
        }

        console.log('✅ Valid Firebase email link confirmed!');

        // Get email from storage (platform-aware)
        console.log('📧 Retrieving saved email from storage...');
        let savedEmail;
        if (Platform.OS === 'web') {
          savedEmail = window.localStorage.getItem('emailForSignIn');
        } else {
          savedEmail = await AsyncStorage.getItem('emailForSignIn');
        }

        console.log('   Saved email:', savedEmail ? savedEmail : 'NOT FOUND');

        if (!savedEmail) {
          // Prompt user to enter email
          console.log('⚠️ Email not found in storage, prompting user...');
          if (Platform.OS === 'web') {
            savedEmail = window.prompt('Please confirm your email address to complete sign-in:');
          } else {
            // For Android, show alert with text input
            Alert.prompt(
              'Confirm Email',
              'Please enter your email address to complete sign-in:',
              async (inputEmail) => {
                if (inputEmail) {
                  console.log('   User entered email:', inputEmail);
                  await completeSignIn(inputEmail, firebaseAuthUrl);
                }
              },
              'plain-text'
            );
            return;
          }

          if (!savedEmail) {
            console.log('⚠️ User cancelled email input');
            return;
          }
        }

        console.log('🔐 Proceeding to complete sign-in...');
        await completeSignIn(savedEmail, firebaseAuthUrl);
      } catch (e) {
        console.error('❌ Error handling email link:', e);
        Alert.alert(t('auth.signInError'), e.message);
      }
    };

    const completeSignIn = async (emailAddress, link) => {
      try {
        console.log('🔐 Completing sign-in with email link...');
        console.log('   Email:', emailAddress);
        console.log('   Link:', link);

        if (Platform.OS === 'web') {
          // Web: Firebase Web SDK
          const result = await signInWithEmailLink(auth, emailAddress, link);
          console.log('✅ User signed in:', result.user.uid);

          // Clear saved email
          window.localStorage.removeItem('emailForSignIn');
        } else {
          // Native: React Native Firebase
          const result = await auth().signInWithEmailLink(emailAddress, link);
          console.log('✅ User signed in:', result.user.uid);

          // Clear saved email
          await AsyncStorage.removeItem('emailForSignIn');
        }

        // Don't show alert - let the auth state listener in App.js handle navigation
        console.log('✅ Sign-in complete. Auth state listener will handle navigation.');
      } catch (e) {
        console.error('❌ Sign-in error:', e);

        let errorMessage = e.message;
        if (e.code === 'auth/invalid-action-code') {
          errorMessage = t('auth.linkExpired');
        } else if (e.code === 'auth/invalid-email') {
          errorMessage = t('auth.pleaseEnterValidEmail');
        }

        Alert.alert(t('auth.signInFailed'), errorMessage);
      }
    };

    if (Platform.OS === 'web') {
      // Web: check current URL on page load
      console.log('🌐 Web platform - checking current URL');
      const currentUrl = window.location.href;
      handleDynamicLink(currentUrl);
    } else {
      // Native: Listen for deep links
      console.log('📱 Native platform - setting up deep link listeners');

      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('📱 Deep link event received:', url);
        handleDynamicLink(url);
      });

      console.log('✅ Deep link listener registered');

      // Check if app was opened with a deep link (cold start)
      console.log('🔍 Checking for initial URL...');
      Linking.getInitialURL().then((url) => {
        if (url) {
          console.log('📱 Initial URL found:', url);
          handleDynamicLink(url);
        } else {
          console.log('ℹ️ No initial URL');
        }
      }).catch(err => {
        console.error('❌ Error getting initial URL:', err);
      });

      return () => {
        console.log('🧹 Removing deep link listener');
        subscription.remove();
      };
    }
  }, []);

  async function sendMagicLink() {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('validation.enterValidEmail'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('validation.invalidEmail'), t('validation.enterValidEmail'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('📧 Sending magic link to:', email);

      // Configure email link settings (platform-aware)
      let actionCodeSettings;

      if (Platform.OS === 'web') {
        // Web: use current origin
        const currentUrl = window.location.origin;
        actionCodeSettings = {
          url: currentUrl,
          handleCodeInApp: true,
        };
      } else {
        // Native: use Firebase hosting domain as continue URL
        // Firebase will construct the auth action URL automatically
        actionCodeSettings = {
          url: 'https://sabalist.firebaseapp.com',
          handleCodeInApp: true,
          android: {
            packageName: 'com.sabalist.app',
            installApp: true,
            minimumVersion: '1',
          },
          iOS: {
            bundleId: 'com.sabalist.app',
          },
        };
      }

      // Send email link (platform-aware)
      if (Platform.OS === 'web') {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Save email locally
        window.localStorage.setItem('emailForSignIn', email);
      } else {
        await auth().sendSignInLinkToEmail(email, actionCodeSettings);
        // Save email locally
        await AsyncStorage.setItem('emailForSignIn', email);
      }

      console.log('✅ Magic link sent successfully!');
      setEmailSent(true);
      setLoading(false);

      Alert.alert(
        t('auth.checkEmail'),
        t('auth.magicLinkSent', { email })
      );
    } catch (e) {
      setLoading(false);
      console.error('❌ Send magic link error:', e);

      let errorMessage = e.message;
      let errorTitle = t('common.error');

      if (e.code === 'auth/invalid-email') {
        errorTitle = t('auth.invalidEmail');
        errorMessage = t('auth.pleaseEnterValidEmail');
      } else if (e.code === 'auth/missing-email') {
        errorTitle = t('auth.emailRequired');
        errorMessage = t('auth.pleaseEnterEmail');
      } else if (e.code === 'auth/unauthorized-continue-uri') {
        errorTitle = t('auth.configError');
        errorMessage = t('auth.configErrorMessage');
      }

      setError(`${e.code}: ${e.message}`);
      Alert.alert(errorTitle, errorMessage);
    }
  }

  async function signInWithGoogle() {
    if (Platform.OS !== 'web') {
      Alert.alert(t('auth.googleNotAvailable'), t('auth.googleNotAvailableMessage'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔵 Starting Google Sign-In...');

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      console.log('✅ User signed in:', result.user.uid);

      setLoading(false);

      Alert.alert(t('auth.welcomeUser'), t('auth.signedInAs', { user: result.user.displayName || result.user.email }));
    } catch (e) {
      setLoading(false);
      console.error('❌ Google Sign-In error:', e);

      let errorMessage = e.message;
      if (e.code === 'auth/popup-closed-by-user') {
        console.log('User cancelled Google Sign-In');
        return;
      }

      setError(`${e.code}: ${e.message}`);
      Alert.alert(t('auth.googleSignInFailed'), errorMessage);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/branding/sabalist-icon-safe.png')}
              style={styles.logoImageLarge}
            />
          </View>
          <Text style={styles.brandName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Auth Card */}
        <Card style={styles.authCard}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              {emailSent ? t('auth.checkYourEmail') : t('auth.welcome')}
            </Text>
            <Text style={styles.welcomeText}>
              {emailSent
                ? t('auth.linkSentTo', { email })
                : t('auth.noPasswordNeeded')
              }
            </Text>

            {/* Error Display */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {!emailSent ? (
            <>
              <View style={styles.emailHint}>
                <Ionicons name="mail" size={16} color={COLORS.info} />
                <Text style={styles.hintText}>
                  {t('auth.emailHint')}
                </Text>
              </View>

              <Input
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                showClear={true}
                editable={!loading}
              />

              <PrimaryButton
                title={t('auth.sendLoginLink')}
                onPress={sendMagicLink}
                loading={loading}
                disabled={loading}
                size="large"
              />

              {/* Divider - only show on web */}
              {Platform.OS === 'web' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Google Sign-In Button - web only */}
                  <PrimaryButton
                    title={t('auth.continueWithGoogle')}
                    onPress={signInWithGoogle}
                    variant="outline"
                    size="large"
                    icon={
                      <Ionicons name="logo-google" size={20} color={COLORS.primary} />
                    }
                  />
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.successText}>
                  {t('auth.loginLinkSentTo', { email })}
                </Text>
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>{t('auth.nextSteps')}</Text>
                <Text style={styles.instructionsText}>
                  {t('auth.nextStepsText')}
                </Text>
              </View>

              <PrimaryButton
                title={t('auth.sendAnotherLink')}
                onPress={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                variant="outline"
                size="medium"
                style={styles.resendButton}
              />
            </>
          )}
        </Card>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="mail"
            title={t('auth.passwordlessLogin')}
            description={t('auth.passwordlessDesc')}
            color={COLORS.success}
          />
          <FeatureItem
            icon="flash"
            title={t('auth.fastFree')}
            description={t('auth.fastFreeDesc')}
            color={COLORS.accent}
          />
          <FeatureItem
            icon="shield-checkmark"
            title={t('auth.securePrivate')}
            description={t('auth.securePrivateDesc')}
            color={COLORS.secondary}
          />
        </View>

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔍 Debug Info:</Text>
          <Text style={styles.debugText}>Auth: Email Magic Link (Firebase)</Text>
          <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
          <Text style={styles.debugText}>Cost: FREE (no SMS)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description, color }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.huge,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    ...SHADOWS.medium,
  },
  logoImageLarge: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  authCard: {
    marginBottom: SPACING.xl,
  },
  welcomeSection: {
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  emailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.info}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.success}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: `${COLORS.primary}05`,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  resendButton: {
    marginTop: SPACING.md,
  },
  featuresSection: {
    gap: SPACING.base,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  debugSection: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: `${COLORS.textMuted}10`,
    borderRadius: RADIUS.md,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  debugText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
});
