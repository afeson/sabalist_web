import React, { useState, useEffect, useRef } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-aware Firebase imports
let auth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithPopup;
let RecaptchaVerifier, signInWithPhoneNumberWeb;
let GoogleSignin;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  const firebaseAuth = require('firebase/auth');
  auth = firebaseWeb.auth;
  sendSignInLinkToEmail = firebaseAuth.sendSignInLinkToEmail;
  isSignInWithEmailLink = firebaseAuth.isSignInWithEmailLink;
  signInWithEmailLink = firebaseAuth.signInWithEmailLink;
  GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
  signInWithPopup = firebaseAuth.signInWithPopup;
  RecaptchaVerifier = firebaseAuth.RecaptchaVerifier;
  signInWithPhoneNumberWeb = firebaseAuth.signInWithPhoneNumber;
} else {
  // Native (Android/iOS) - @react-native-firebase
  const firebaseNative = require('../lib/firebase');
  auth = firebaseNative.auth;
  // Native Google Sign-In
  try {
    const googleSignIn = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignIn.GoogleSignin;
    GoogleSignin.configure({
      webClientId: '231273918004-smt9rcdm8omt68aefj2bv0pk3n5202kc.apps.googleusercontent.com',
    });
    console.log('Google Sign-In configured');
  } catch (e) {
    console.warn('Google Sign-In not available:', e.message);
  }
}

import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';
import Input from '../components/Input';
import OpenMailApp from '../components/auth/OpenMailApp';
import ResendCountdown from '../components/auth/ResendCountdown';

// 'phone' is the recommended primary path: SMS is far more reliable than
// email on mobile-first African markets where users rarely check inboxes
// and email is frequently routed to spam. Magic link is retained as a
// secondary option.
const METHODS = {
  PHONE: 'phone',
  EMAIL: 'email',
};

export default function AuthScreen() {
  const { t, i18n } = useTranslation();
  const [authMethod, setAuthMethod] = useState(METHODS.PHONE);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState(0); // resetKey for ResendCountdown
  const [error, setError] = useState('');
  const [, forceUpdate] = useState(0);

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeSentAt, setCodeSentAt] = useState(0);
  const [verifyingCode, setVerifyingCode] = useState(false);
  // Holds the Firebase confirmation object between "send" and "verify"
  // (web: ConfirmationResult, native: PhoneAuthSnapshot)
  const phoneConfirmationRef = useRef(null);
  // Holds the RecaptchaVerifier instance on web so we can clean it up
  const recaptchaVerifierRef = useRef(null);

  // Force re-render when language changes (even if screen is already focused)
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

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
      setEmailSentAt(Date.now());
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

  /**
   * Validate a phone number in E.164-ish form. Firebase requires the
   * leading `+` and country code (e.g. +254712345678). We don't do full
   * country validation here — just shape — and let Firebase reject
   * obviously bad numbers.
   */
  function isValidE164(value) {
    return /^\+\d{8,15}$/.test(value.replace(/\s/g, ''));
  }

  /**
   * Lazily create (or reuse) the invisible reCAPTCHA verifier for web.
   * The DOM container `#recaptcha-container` is rendered below by RN-Web
   * via `nativeID`.
   */
  async function getRecaptchaVerifier() {
    if (Platform.OS !== 'web') return null;
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
    await verifier.render();
    recaptchaVerifierRef.current = verifier;
    return verifier;
  }

  /** Reset the phone flow so the user can restart (e.g. wrong number). */
  function resetPhoneFlow() {
    setCode('');
    setCodeSent(false);
    phoneConfirmationRef.current = null;
    if (recaptchaVerifierRef.current?.clear) {
      try { recaptchaVerifierRef.current.clear(); } catch {}
    }
    recaptchaVerifierRef.current = null;
  }

  /** Send the 6-digit OTP to the phone number. */
  async function sendPhoneCode() {
    const trimmed = phone.replace(/\s/g, '');
    if (!isValidE164(trimmed)) {
      Alert.alert(t('auth.invalidPhoneNumber'), t('auth.invalidPhoneMessage'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('📱 Sending OTP to:', trimmed);

      let confirmation;
      if (Platform.OS === 'web') {
        const verifier = await getRecaptchaVerifier();
        confirmation = await signInWithPhoneNumberWeb(auth, trimmed, verifier);
      } else {
        confirmation = await auth().signInWithPhoneNumber(trimmed);
      }

      phoneConfirmationRef.current = confirmation;
      setCodeSent(true);
      setCodeSentAt(Date.now());
      setLoading(false);
      console.log('✅ OTP sent');
    } catch (e) {
      setLoading(false);
      console.error('❌ sendPhoneCode error:', e);
      let title = t('common.error');
      let message = e.message || 'Could not send code';
      if (e.code === 'auth/invalid-phone-number') {
        title = t('auth.invalidPhoneNumber');
        message = t('auth.invalidPhoneMessage');
      } else if (e.code === 'auth/too-many-requests' || e.code === 'auth/quota-exceeded') {
        title = t('auth.smsQuotaExceeded') || 'Too many attempts';
        message = t('auth.smsQuotaMessage') || 'Please try again later.';
      }
      setError(`${e.code || 'error'}: ${e.message}`);
      Alert.alert(title, message);
      // Recaptcha can get stuck after an error — reset it so the next send works.
      if (recaptchaVerifierRef.current?.clear) {
        try { recaptchaVerifierRef.current.clear(); } catch {}
        recaptchaVerifierRef.current = null;
      }
    }
  }

  /** Verify the user-entered 6-digit code and sign in. */
  async function verifyPhoneCode() {
    const clean = code.replace(/\s/g, '');
    if (clean.length < 6) {
      Alert.alert(
        t('auth.codeRequired') || 'Enter the 6-digit code',
        t('auth.codeRequiredMessage') || 'Please enter the verification code you received'
      );
      return;
    }
    if (!phoneConfirmationRef.current) {
      Alert.alert(t('common.error'), 'No active verification. Please request a new code.');
      setCodeSent(false);
      return;
    }

    try {
      setVerifyingCode(true);
      setError('');
      const result = await phoneConfirmationRef.current.confirm(clean);
      console.log('✅ Phone sign-in complete:', result?.user?.uid);
      // Auth state listener takes over — no manual navigation needed.
    } catch (e) {
      console.error('❌ verifyPhoneCode error:', e);
      let message = e.message || 'Verification failed';
      if (e.code === 'auth/invalid-verification-code') {
        message = t('auth.invalidCode') || 'Invalid code. Please try again.';
      } else if (e.code === 'auth/code-expired') {
        message = t('auth.codeExpired') || 'Code expired. Please request a new one.';
        setCodeSent(false);
      }
      setError(`${e.code || 'error'}: ${e.message}`);
      Alert.alert(t('auth.verificationFailed') || t('common.error'), message);
    } finally {
      setVerifyingCode(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setLoading(true);
      setError('');

      console.log('Starting Google Sign-In...');

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('User signed in:', result.user.uid);
      } else {
        // Native Google Sign-In
        if (!GoogleSignin) {
          Alert.alert('Error', 'Google Sign-In is not available on this device.');
          setLoading(false);
          return;
        }

        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult?.data?.idToken || signInResult?.idToken;

        if (!idToken) {
          throw new Error('No ID token received from Google Sign-In');
        }

        console.log('Google ID token obtained, signing into Firebase...');
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        const result = await auth().signInWithCredential(googleCredential);
        console.log('User signed in:', result.user.uid);
      }

      setLoading(false);
      console.log('Sign-in complete. Auth state listener will handle navigation.');
    } catch (e) {
      setLoading(false);
      console.error('Google Sign-In error:', e);

      // User cancelled
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'SIGN_IN_CANCELLED' || e.code === '12501') {
        console.log('User cancelled Google Sign-In');
        return;
      }

      setError(`${e.code || 'error'}: ${e.message}`);
      Alert.alert(t('auth.googleSignInFailed') || 'Sign-In Failed', e.message);
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
          {/* Method tabs: Phone (primary) | Email */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, authMethod === METHODS.PHONE && styles.tabActive]}
              onPress={() => {
                setError('');
                setAuthMethod(METHODS.PHONE);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="call"
                size={16}
                color={authMethod === METHODS.PHONE ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, authMethod === METHODS.PHONE && styles.tabTextActive]}>
                {t('auth.phoneTab') !== 'auth.phoneTab' ? t('auth.phoneTab') : 'Phone'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, authMethod === METHODS.EMAIL && styles.tabActive]}
              onPress={() => {
                setError('');
                setAuthMethod(METHODS.EMAIL);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="mail"
                size={16}
                color={authMethod === METHODS.EMAIL ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, authMethod === METHODS.EMAIL && styles.tabTextActive]}>
                {t('auth.emailTab') !== 'auth.emailTab' ? t('auth.emailTab') : 'Email'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error display (shared across methods) */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ==================== PHONE TAB ==================== */}
          {authMethod === METHODS.PHONE && !codeSent && (
            <>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>
                  {t('auth.phoneSignInTitle') !== 'auth.phoneSignInTitle'
                    ? t('auth.phoneSignInTitle')
                    : 'Sign in with phone'}
                </Text>
                <Text style={styles.welcomeText}>
                  {t('auth.phoneSignInDesc') !== 'auth.phoneSignInDesc'
                    ? t('auth.phoneSignInDesc')
                    : "We'll text you a 6-digit code"}
                </Text>
              </View>

              <View style={styles.emailHint}>
                <Ionicons name="information-circle" size={16} color={COLORS.info} />
                <Text style={styles.hintText}>{t('auth.phoneHint')}</Text>
              </View>

              <Input
                label={t('auth.phoneLabel')}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phonePlaceholder')}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                showClear={true}
                editable={!loading}
              />

              <PrimaryButton
                title={t('auth.sendOTP')}
                onPress={sendPhoneCode}
                loading={loading}
                disabled={loading}
                size="large"
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orDivider') || 'OR'}</Text>
                <View style={styles.dividerLine} />
              </View>

              <PrimaryButton
                title={t('auth.continueWithGoogle') || 'Continue with Google'}
                onPress={signInWithGoogle}
                variant="outline"
                size="large"
                icon={<Ionicons name="logo-google" size={20} color={COLORS.primary} />}
              />
            </>
          )}

          {authMethod === METHODS.PHONE && codeSent && (
            <>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.successText}>{t('auth.codeSentTo', { phone })}</Text>
              </View>

              <Input
                label={t('auth.codeLabel')}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                showClear={true}
                editable={!verifyingCode}
                maxLength={6}
              />

              <PrimaryButton
                title={t('auth.verify')}
                onPress={verifyPhoneCode}
                loading={verifyingCode}
                disabled={verifyingCode || code.length < 6}
                size="large"
              />

              <View style={styles.fallbackRow}>
                <ResendCountdown
                  seconds={60}
                  resetKey={codeSentAt}
                  onResend={sendPhoneCode}
                />
                <TouchableOpacity onPress={resetPhoneFlow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.linkText}>
                    {t('auth.changePhoneNumber') !== 'auth.changePhoneNumber'
                      ? t('auth.changePhoneNumber')
                      : 'Change number'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ==================== EMAIL TAB ==================== */}
          {authMethod === METHODS.EMAIL && !emailSent && (
            <>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>{t('auth.welcome')}</Text>
                <Text style={styles.welcomeText}>{t('auth.noPasswordNeeded')}</Text>
              </View>

              <View style={styles.emailHint}>
                <Ionicons name="mail" size={16} color={COLORS.info} />
                <Text style={styles.hintText}>{t('auth.emailHint')}</Text>
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

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orDivider') || 'OR'}</Text>
                <View style={styles.dividerLine} />
              </View>

              <PrimaryButton
                title={t('auth.continueWithGoogle') || 'Continue with Google'}
                onPress={signInWithGoogle}
                variant="outline"
                size="large"
                icon={<Ionicons name="logo-google" size={20} color={COLORS.primary} />}
              />
            </>
          )}

          {authMethod === METHODS.EMAIL && emailSent && (
            <>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>{t('auth.checkYourEmail')}</Text>
                <Text style={styles.welcomeText}>{t('auth.linkSentTo', { email })}</Text>
              </View>

              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.successText}>{t('auth.loginLinkSentTo', { email })}</Text>
              </View>

              {/* "Open Mail App" helper */}
              <OpenMailApp />

              {/* "Didn't receive?" fallback panel */}
              <View style={styles.fallbackPanel}>
                <Text style={styles.fallbackTitle}>
                  {t('auth.didntReceive') !== 'auth.didntReceive'
                    ? t('auth.didntReceive')
                    : "Didn't receive the email?"}
                </Text>
                <View style={styles.fallbackBullet}>
                  <Ionicons name="ellipse" size={6} color={COLORS.textMuted} />
                  <Text style={styles.fallbackText}>
                    {t('auth.checkSpam') !== 'auth.checkSpam'
                      ? t('auth.checkSpam')
                      : 'Check your spam or promotions folder'}
                  </Text>
                </View>
                <View style={styles.fallbackRow}>
                  <ResendCountdown
                    seconds={60}
                    resetKey={emailSentAt}
                    onResend={sendMagicLink}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.linkText}>
                      {t('auth.useDifferentEmail') !== 'auth.useDifferentEmail'
                        ? t('auth.useDifferentEmail')
                        : 'Use a different email'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.tryAnotherBtn}
                  onPress={() => {
                    setAuthMethod(METHODS.PHONE);
                    setEmailSent(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={16} color={COLORS.primary} />
                  <Text style={styles.tryAnotherText}>
                    {t('auth.tryPhoneInstead') !== 'auth.tryPhoneInstead'
                      ? t('auth.tryPhoneInstead')
                      : 'Use phone number instead'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Invisible reCAPTCHA container — web only, required by Firebase
              phone auth. RN-Web maps nativeID -> id. */}
          {Platform.OS === 'web' && (
            <View nativeID="recaptcha-container" style={styles.recaptcha} />
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  fallbackPanel: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  fallbackBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fallbackText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  tryAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.primary}10`,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  tryAnotherText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recaptcha: {
    height: 0,
    width: 0,
    overflow: 'hidden',
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
});
