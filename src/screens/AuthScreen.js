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
let AppleAuthentication;
let Crypto;
let Crashlytics;
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
  // Set explicit phone-auth defaults at module load so any prior state
  // (e.g. dev/testing overrides shipped accidentally) is reset to the
  // production-safe values before the first sign-in attempt.
  try {
    if (typeof auth === 'function' && auth().settings) {
      auth().settings.appVerificationDisabledForTesting = false;
    }
  } catch (e) {
    console.warn('auth().settings init failed:', e?.message);
  }
  // Crashlytics — for capturing native crash stacks that JS guards cannot.
  try {
    const c = firebaseNative.crashlytics;
    if (c) Crashlytics = c;
  } catch {}
  // Native Google Sign-In. iosClientId is required on iOS in v16+; without
  // it the OAuth flow can't return to the app and the call crashes.
  try {
    const googleSignIn = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignIn.GoogleSignin;
    const googleConfig = {
      webClientId: '231273918004-smt9rcdm8omt68aefj2bv0pk3n5202kc.apps.googleusercontent.com',
    };
    if (Platform.OS === 'ios') {
      // iOS OAuth client from ios/GoogleService-Info.plist (CLIENT_ID).
      googleConfig.iosClientId =
        '231273918004-2h81pu77f4obv9u114ivprf6lv5fk1c4.apps.googleusercontent.com';
    }
    GoogleSignin.configure(googleConfig);
    console.log('Google Sign-In configured');
  } catch (e) {
    console.warn('Google Sign-In not available:', e.message);
  }
  // Apple Sign-In (iOS only — App Store guideline 4.8 requires this when
  // any third-party sign-in is offered). expo-crypto is required to hash
  // the nonce that Apple signs; Firebase rejects credentials when the
  // raw/hashed nonce relationship is wrong.
  if (Platform.OS === 'ios') {
    try {
      AppleAuthentication = require('expo-apple-authentication');
      Crypto = require('expo-crypto');
    } catch (e) {
      console.warn('Apple Sign-In not available:', e.message);
    }
  }
}

import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';
import Input from '../components/Input';
import OpenMailApp from '../components/auth/OpenMailApp';
import ResendCountdown from '../components/auth/ResendCountdown';
import PhoneAuthWebView from '../components/auth/PhoneAuthWebView';

// 'phone' is the recommended primary path: SMS is far more reliable than
// email on mobile-first African markets where users rarely check inboxes
// and email is frequently routed to spam. Magic link is retained as a
// secondary option.
const METHODS = {
  PHONE: 'phone',
  EMAIL: 'email',
};

// Phone sign-in is currently disabled on iOS. The native Firebase Phone
// Auth path crashes, the WebView reCAPTCHA fallback stalls — both being
// pursued separately. For App Store review, we ship iOS with Email +
// Google + Apple only. Android keeps phone as primary.
const PHONE_AUTH_ENABLED = Platform.OS !== 'ios';

// Race any native-auth promise against a timeout so the UI is never stuck
// spinning if the underlying SDK hangs (most common cause on Android:
// Play Integrity / SafetyNet attestation never resolving when the running
// app's signing-key SHA isn't registered in Firebase).
const AUTH_TIMEOUT_MS = 20000;
function withAuthTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timed out after ${AUTH_TIMEOUT_MS / 1000}s: ${label}`);
      err.code = 'auth/timeout';
      err.label = label;
      reject(err);
    }, AUTH_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function logAuthError(label, e) {
  const dump = {
    label,
    code: e?.code,
    message: e?.message,
    nativeErrorCode: e?.nativeErrorCode,
    userInfo: e?.userInfo,
  };
  console.error('AUTH_ERROR', JSON.stringify(dump));
  try { console.error('AUTH_ERROR_RAW', e); } catch {}
  try { console.error('AUTH_ERROR_STACK', e?.stack); } catch {}
  // Report to Crashlytics so the error (with stack) appears in Firebase
  // Console even when JS try/catch handled it — invaluable for diagnosis
  // when native code rejects with cryptic codes.
  try {
    if (Crashlytics && e instanceof Error) {
      Crashlytics().recordError(e, label);
    }
  } catch {}
  // Persist breadcrumb so a subsequent app launch (after a native crash)
  // can show what step we got to. Not awaited — best effort.
  try {
    AsyncStorage.setItem(
      'authLastError',
      JSON.stringify({ ...dump, at: new Date().toISOString() })
    ).catch(() => {});
  } catch {}
}

/**
 * Synchronously-flushed single-key marker. Awaited before any potentially
 * crashing native call, so the value is guaranteed on disk if the next
 * line crashes the native side. Survives the crash; on next launch the
 * long-press logo diagnostic exposes the value as `lastStep`.
 */
async function markStep(step) {
  try {
    if (Crashlytics) {
      try { Crashlytics().log(`MARK ${step}`); } catch {}
    }
    await AsyncStorage.setItem(
      'lastPhoneAuthStep',
      JSON.stringify({ step, at: new Date().toISOString() })
    );
  } catch (e) {
    console.warn('markStep failed:', e?.message);
  }
}

/**
 * Append a step breadcrumb to AsyncStorage. If iOS phone auth crashes
 * natively (which JS try/catch cannot intercept), the last persisted step
 * survives the crash and we can inspect it on next launch.
 */
async function logAuthStep(step, extra) {
  try {
    const entry = { step, at: new Date().toISOString(), ...(extra || {}) };
    console.log('AUTH_STEP', JSON.stringify(entry));
    // Crashlytics breadcrumb — survives a native crash. Synchronous from
    // JS's perspective; the value is queued by the native module.
    try {
      if (Crashlytics) {
        Crashlytics().log(`AUTH_STEP ${step}${extra ? ' ' + JSON.stringify(extra) : ''}`);
      }
    } catch {}
    const prev = (await AsyncStorage.getItem('authBreadcrumbs')) || '[]';
    let arr;
    try { arr = JSON.parse(prev); } catch { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.push(entry);
    // Cap at last 50 entries
    if (arr.length > 50) arr.splice(0, arr.length - 50);
    await AsyncStorage.setItem('authBreadcrumbs', JSON.stringify(arr));
  } catch (e) {
    console.warn('logAuthStep failed:', e?.message);
  }
}

export default function AuthScreen() {
  const { t, i18n } = useTranslation();
  const [authMethod, setAuthMethod] = useState(
    PHONE_AUTH_ENABLED ? METHODS.PHONE : METHODS.EMAIL
  );
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
  // iOS phone auth uses a WebView-based reCAPTCHA flow (the native
  // FIRPhoneAuthProvider path crashes on iOS; see PhoneAuthWebView.js).
  // verificationId is set by the WebView after Firebase Web SDK
  // completes signInWithPhoneNumber; we then use PhoneAuthProvider
  // .credential(verificationId, code) to sign in via the SDK.
  const [webViewPhone, setWebViewPhone] = useState(null);
  const verificationIdRef = useRef(null);

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
          const result = await withAuthTimeout(
            signInWithEmailLink(auth, emailAddress, link),
            'web.signInWithEmailLink'
          );
          console.log('✅ User signed in:', result.user.uid);

          // Clear saved email
          window.localStorage.removeItem('emailForSignIn');
        } else {
          // Native: React Native Firebase
          const result = await withAuthTimeout(
            auth().signInWithEmailLink(emailAddress, link),
            'native.signInWithEmailLink'
          );
          console.log('✅ User signed in:', result.user.uid);

          // Clear saved email
          await AsyncStorage.removeItem('emailForSignIn');
        }

        // Don't show alert - let the auth state listener in App.js handle navigation
        console.log('✅ Sign-in complete. Auth state listener will handle navigation.');
      } catch (e) {
        logAuthError('completeSignIn', e);

        let errorMessage = `[${e.code || 'unknown'}] ${e.message || 'Unknown error'}`;
        if (e.code === 'auth/invalid-action-code') {
          errorMessage = t('auth.linkExpired');
        } else if (e.code === 'auth/invalid-email') {
          errorMessage = t('auth.pleaseEnterValidEmail');
        } else if (e.code === 'auth/timeout') {
          errorMessage = 'Sign-in timed out. Check your internet and try again.';
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
        await withAuthTimeout(
          sendSignInLinkToEmail(auth, email, actionCodeSettings),
          'web.sendSignInLinkToEmail'
        );
        // Save email locally
        window.localStorage.setItem('emailForSignIn', email);
      } else {
        await withAuthTimeout(
          auth().sendSignInLinkToEmail(email, actionCodeSettings),
          'native.sendSignInLinkToEmail'
        );
        // Save email locally
        await AsyncStorage.setItem('emailForSignIn', email);
      }

      console.log('✅ Magic link sent successfully!');
      setEmailSent(true);
      setEmailSentAt(Date.now());

      Alert.alert(
        t('auth.checkEmail'),
        t('auth.magicLinkSent', { email })
      );
    } catch (e) {
      logAuthError('sendMagicLink', e);

      let errorMessage = `[${e.code || 'unknown'}] ${e.message || 'Unknown error'}`;
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
      } else if (e.code === 'auth/timeout') {
        errorTitle = 'Sign-in timed out';
        errorMessage = 'The server did not respond. Check your internet and try again.';
      }

      setError(`${e.code || 'error'}: ${e.message || ''}`);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
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
    verificationIdRef.current = null;
    if (recaptchaVerifierRef.current?.clear) {
      try { recaptchaVerifierRef.current.clear(); } catch {}
    }
    recaptchaVerifierRef.current = null;
  }

  /**
   * Wraps a native call so that synchronous throws (e.g. when the native
   * module is missing or the auth singleton hasn't initialized) become
   * promise rejections we can handle, instead of crashing JS or — worse,
   * on iOS — surfacing as an uncaught native exception.
   */
  function safeNativeCall(label, thunk) {
    return new Promise((resolve, reject) => {
      try {
        const p = thunk();
        if (!p || typeof p.then !== 'function') {
          reject(Object.assign(new Error(`${label}: native call did not return a promise`), {
            code: 'auth/native-call-invalid',
          }));
          return;
        }
        p.then(resolve, reject);
      } catch (syncErr) {
        reject(syncErr);
      }
    });
  }

  /** Send the 6-digit OTP to the phone number. */
  async function sendPhoneCode() {
    const trimmed = phone.replace(/\s/g, '');
    if (!isValidE164(trimmed)) {
      Alert.alert(t('auth.invalidPhoneNumber'), t('auth.invalidPhoneMessage'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📱 Sending OTP to:', trimmed);
      await markStep('handler.entered');
      logAuthStep('sendPhoneCode.start', { platform: Platform.OS, phoneLen: trimmed.length });

      // iOS path: use the WebView-based Firebase Web SDK flow because the
      // native FIRPhoneAuthProvider path crashes (see PhoneAuthWebView.js).
      // We open the WebView modal; it does reCAPTCHA + signInWithPhoneNumber
      // and posts back a verificationId. Loading state is released by
      // handleWebViewResult.
      if (Platform.OS === 'ios') {
        await markStep('ios.openingWebView');
        setWebViewPhone(trimmed);
        return; // sendPhoneCode resumes in handleWebViewResult
      }

      let confirmation;
      if (Platform.OS === 'web') {
        await markStep('web.getVerifier');
        const verifier = await getRecaptchaVerifier();
        await markStep('web.callSDK');
        confirmation = await withAuthTimeout(
          signInWithPhoneNumberWeb(auth, trimmed, verifier),
          'web.signInWithPhoneNumber'
        );
      } else {
        // Android: keep the native SDK path (no known crash).
        if (typeof auth !== 'function') {
          throw Object.assign(new Error('Auth module is not available'), {
            code: 'auth/not-initialized',
          });
        }
        await markStep('android.preCheck');
        const authInstance = auth();
        if (!authInstance || typeof authInstance.signInWithPhoneNumber !== 'function') {
          throw Object.assign(new Error('Phone sign-in is not available in this build'), {
            code: 'auth/phone-unavailable',
          });
        }
        await markStep('android.aboutToCallSDK');
        confirmation = await withAuthTimeout(
          safeNativeCall('native.signInWithPhoneNumber', () =>
            authInstance.signInWithPhoneNumber(trimmed)
          ),
          'native.signInWithPhoneNumber'
        );
        await markStep('android.sdkReturned');
      }

      if (!confirmation) {
        throw Object.assign(new Error('No confirmation object returned'), {
          code: 'auth/no-confirmation',
        });
      }

      phoneConfirmationRef.current = confirmation;
      setCodeSent(true);
      setCodeSentAt(Date.now());
      console.log('✅ OTP sent');
      logAuthStep('sendPhoneCode.success');
    } catch (e) {
      logAuthError('sendPhoneCode', e);
      let title = t('common.error');
      let message = 'Could not send the verification code. Please try again or use email sign-in.';
      const code = e?.code || '';
      if (code === 'auth/invalid-phone-number') {
        title = t('auth.invalidPhoneNumber');
        message = t('auth.invalidPhoneMessage');
      } else if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
        title = t('auth.smsQuotaExceeded') || 'Too many attempts';
        message = t('auth.smsQuotaMessage') || 'Please wait a few minutes and try again.';
      } else if (code === 'auth/timeout') {
        title = 'Sign-in timed out';
        message = 'The server did not respond. Please check your internet connection or use email sign-in.';
      } else if (code === 'auth/app-not-authorized' || code === 'auth/missing-app-credential') {
        title = 'Sign-in temporarily unavailable';
        message = 'Phone sign-in is not available in this build. Please use email sign-in instead.';
      } else if (code === 'auth/network-request-failed') {
        title = 'Network error';
        message = 'Please check your internet connection and try again.';
      } else if (code === 'auth/not-initialized' || code === 'auth/phone-unavailable' || code === 'auth/native-call-invalid') {
        title = 'Phone sign-in unavailable';
        message = 'Phone sign-in is not available right now. Please use email sign-in.';
      } else if (code === 'auth/captcha-check-failed' || code === 'auth/web-storage-unsupported') {
        title = 'Verification failed';
        message = 'Please try again or use email sign-in.';
      }
      setError(`${code || 'error'}: ${e?.message || ''}`);
      Alert.alert(title, message);
      // Recaptcha can get stuck after an error — reset it so the next send works.
      if (recaptchaVerifierRef.current?.clear) {
        try { recaptchaVerifierRef.current.clear(); } catch {}
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Receive the verification result from the WebView phone-auth flow.
   * Either a verificationId (success) or an error.
   */
  function handleWebViewResult(result) {
    setWebViewPhone(null); // close the modal
    if (result?.error) {
      logAuthError('phoneAuthWebView', new Error(`${result.error.code}: ${result.error.message}`));
      let message = 'Could not start phone verification. Please try again or use email sign-in.';
      const ec = result.error.code || '';
      if (ec === 'auth/invalid-phone-number') {
        message = t('auth.invalidPhoneMessage');
      } else if (ec === 'auth/too-many-requests' || ec === 'auth/quota-exceeded') {
        message = t('auth.smsQuotaMessage') || 'Too many attempts. Please try again later.';
      } else if (ec === 'auth/captcha-check-failed' || ec === 'web/recaptcha-expired') {
        message = 'Security check failed. Please try again.';
      } else if (ec === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection and try again.';
      }
      setError(`${ec}: ${result.error.message || ''}`);
      Alert.alert(t('common.error'), message);
      setLoading(false);
      return;
    }
    if (result?.verificationId) {
      verificationIdRef.current = result.verificationId;
      setCodeSent(true);
      setCodeSentAt(Date.now());
      logAuthStep('sendPhoneCode.success', { via: 'webview' });
    }
    setLoading(false);
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

    // iOS: verify via PhoneAuthProvider.credential + signInWithCredential
    // (no native FIRPhoneAuthProvider verification — that crashed). The
    // verificationId from the WebView is passed directly to the SDK.
    if (Platform.OS === 'ios') {
      const verificationId = verificationIdRef.current;
      if (!verificationId) {
        Alert.alert(t('common.error'), 'Please request a new code.');
        setCodeSent(false);
        return;
      }
      setVerifyingCode(true);
      setError('');
      try {
        await markStep('ios.verify.createCredential');
        const provider = auth.PhoneAuthProvider;
        if (!provider || typeof provider.credential !== 'function') {
          throw Object.assign(new Error('PhoneAuthProvider unavailable'), {
            code: 'auth/provider-missing',
          });
        }
        const credential = provider.credential(verificationId, clean);
        await markStep('ios.verify.signInWithCredential');
        const result = await withAuthTimeout(
          safeNativeCall('native.signInWithCredential.phone', () =>
            auth().signInWithCredential(credential)
          ),
          'native.signInWithCredential.phone'
        );
        await markStep('ios.verify.success');
        console.log('✅ Phone sign-in complete:', result?.user?.uid);
        return;
      } catch (e) {
        logAuthError('verifyPhoneCode.ios', e);
        let message = 'Could not verify the code. Please try again.';
        const ec = e?.code || '';
        if (ec === 'auth/invalid-verification-code') {
          message = t('auth.invalidCode') || 'Invalid code. Please try again.';
        } else if (ec === 'auth/code-expired') {
          message = t('auth.codeExpired') || 'Code expired. Please request a new one.';
          setCodeSent(false);
        } else if (ec === 'auth/session-expired') {
          message = 'The verification session expired. Please request a new code.';
          setCodeSent(false);
        } else if (ec === 'auth/network-request-failed') {
          message = 'Network error. Please check your connection and try again.';
        }
        setError(`${ec}: ${e?.message || ''}`);
        Alert.alert(t('auth.verificationFailed') || t('common.error'), message);
        return;
      } finally {
        setVerifyingCode(false);
      }
    }

    if (!phoneConfirmationRef.current) {
      Alert.alert(t('common.error'), 'No active verification. Please request a new code.');
      setCodeSent(false);
      return;
    }

    setVerifyingCode(true);
    setError('');

    try {
      const confirmRef = phoneConfirmationRef.current;
      if (!confirmRef || typeof confirmRef.confirm !== 'function') {
        throw Object.assign(new Error('Verification session is no longer valid'), {
          code: 'auth/no-confirmation',
        });
      }
      const result = await withAuthTimeout(
        safeNativeCall('phoneConfirmation.confirm', () => confirmRef.confirm(clean)),
        'phoneConfirmation.confirm'
      );
      console.log('✅ Phone sign-in complete:', result?.user?.uid);
      // Auth state listener takes over — no manual navigation needed.
    } catch (e) {
      logAuthError('verifyPhoneCode', e);
      let message = 'Could not verify the code. Please try again.';
      const code = e?.code || '';
      if (code === 'auth/invalid-verification-code') {
        message = t('auth.invalidCode') || 'Invalid code. Please try again.';
      } else if (code === 'auth/code-expired') {
        message = t('auth.codeExpired') || 'Code expired. Please request a new one.';
        setCodeSent(false);
      } else if (code === 'auth/timeout') {
        message = 'Verification timed out. Please request a new code.';
      } else if (code === 'auth/no-confirmation') {
        message = 'Please request a new code.';
        setCodeSent(false);
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection and try again.';
      } else if (code === 'auth/session-expired') {
        message = 'The verification session expired. Please request a new code.';
        setCodeSent(false);
      }
      setError(`${code || 'error'}: ${e?.message || ''}`);
      Alert.alert(t('auth.verificationFailed') || t('common.error'), message);
    } finally {
      setVerifyingCode(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError('');

    try {
      console.log('Starting Google Sign-In...');

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await withAuthTimeout(
          signInWithPopup(auth, provider),
          'web.signInWithPopup'
        );
        console.log('User signed in:', result.user.uid);
      } else {
        // Native Google Sign-In
        if (!GoogleSignin) {
          Alert.alert(t('common.error'), 'Google Sign-In is not available on this device.');
          return;
        }
        if (typeof GoogleSignin.signIn !== 'function') {
          throw Object.assign(new Error('Google Sign-In module is missing on this build'), {
            code: 'google/module-missing',
          });
        }

        // hasPlayServices is Android-only. In v16+ it throws on iOS, which
        // crashes the flow before signIn() is even reached.
        if (Platform.OS === 'android') {
          await withAuthTimeout(
            safeNativeCall('GoogleSignin.hasPlayServices', () =>
              GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
            ),
            'GoogleSignin.hasPlayServices'
          );
        }

        // On iOS, the OAuth flow can leave a stale session that fails the
        // next signIn(). Best-effort sign out before re-attempting.
        try {
          if (typeof GoogleSignin.signOut === 'function') {
            await GoogleSignin.signOut();
          }
        } catch {}

        const signInResult = await withAuthTimeout(
          safeNativeCall('GoogleSignin.signIn', () => GoogleSignin.signIn()),
          'GoogleSignin.signIn'
        );
        // v16+ returns { type: 'success'|'cancelled', data: { idToken, ... } }
        // Older returns { idToken, ... } directly.
        if (signInResult?.type === 'cancelled') {
          console.log('User cancelled Google Sign-In');
          return;
        }
        const idToken = signInResult?.data?.idToken || signInResult?.idToken;

        if (!idToken) {
          throw Object.assign(new Error('No ID token received from Google Sign-In'), {
            code: 'google/no-id-token',
          });
        }

        console.log('Google ID token obtained, signing into Firebase...');
        const provider = auth.GoogleAuthProvider;
        if (!provider || typeof provider.credential !== 'function') {
          throw Object.assign(new Error('Firebase GoogleAuthProvider is unavailable'), {
            code: 'google/provider-missing',
          });
        }
        const googleCredential = provider.credential(idToken);
        const result = await withAuthTimeout(
          safeNativeCall('native.signInWithCredential.google', () =>
            auth().signInWithCredential(googleCredential)
          ),
          'native.signInWithCredential.google'
        );
        console.log('User signed in:', result.user.uid);
      }

      console.log('Sign-in complete. Auth state listener will handle navigation.');
    } catch (e) {
      // User cancelled (across SDK versions)
      const code = e?.code || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'SIGN_IN_CANCELLED' ||
        code === '12501' ||
        code === '-5'
      ) {
        console.log('User cancelled Google Sign-In');
        return;
      }

      logAuthError('signInWithGoogle', e);

      let title = t('auth.googleSignInFailed') || 'Sign-In Failed';
      let message = 'Something went wrong signing in with Google. Please try again.';
      if (code === 'DEVELOPER_ERROR' || code === '10') {
        message = 'Google Sign-In is not configured correctly for this build. Please use email or Apple sign-in.';
      } else if (code === 'auth/timeout') {
        message = 'Google did not respond. Check your connection and try again.';
      } else if (code === 'auth/invalid-credential') {
        message = 'Your Google Sign-In session expired. Please try again.';
      } else if (code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with this email under a different sign-in method.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection and try again.';
      } else if (code === 'google/no-id-token' || code === 'google/module-missing' || code === 'google/provider-missing' || code === 'auth/native-call-invalid') {
        message = 'Google Sign-In is unavailable on this device right now. Please use email or Apple sign-in.';
      }

      setError(`${code || 'error'}: ${e?.message || ''}`);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  }

  // Apple Sign-In: required by App Store guideline 4.8 whenever a third-
  // party sign-in (Google, here) is offered.
  //
  // Critical nonce flow: Firebase rejects the credential as malformed
  // (auth/invalid-credential) unless we:
  //   1. generate a raw random nonce ourselves,
  //   2. send the SHA-256 hash of that raw nonce to Apple,
  //   3. then pass the *raw* (unhashed) nonce to OAuthProvider.credential.
  // Apple embeds the hashed nonce in the identity token so Firebase can
  // verify the chain. If we skip the hash step (or pass Apple's own nonce
  // back), the chain breaks and Firebase errors with invalid-credential.
  async function signInWithApple() {
    try {
      setLoading(true);
      setError('');

      if (!AppleAuthentication || !Crypto) {
        Alert.alert(t('common.error'), 'Apple Sign-In is not available on this device.');
        return;
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('common.error'), 'Apple Sign-In requires iOS 13 or later.');
        return;
      }

      // Generate raw nonce + its SHA-256 hash.
      const rawNonce = Crypto.randomUUID
        ? Crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      console.log('Starting Apple Sign-In with hashed nonce');
      const appleCredential = await withAuthTimeout(
        AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        }),
        'AppleAuthentication.signInAsync'
      );

      const identityToken = appleCredential?.identityToken;
      if (!identityToken) {
        throw Object.assign(new Error('Apple did not return an identity token'), {
          code: 'apple/no-identity-token',
        });
      }

      console.log('Apple identity token obtained, signing into Firebase...');
      const provider = auth.AppleAuthProvider;
      if (!provider || typeof provider.credential !== 'function') {
        throw Object.assign(new Error('Firebase AppleAuthProvider is unavailable in this build'), {
          code: 'apple/provider-missing',
        });
      }
      // Pass the *raw* nonce here (Firebase will hash it and compare to the
      // hashed nonce embedded in identityToken).
      const firebaseCredential = provider.credential(identityToken, rawNonce);
      const result = await withAuthTimeout(
        auth().signInWithCredential(firebaseCredential),
        'native.signInWithCredential.apple'
      );
      console.log('User signed in (Apple):', result.user.uid);

      // Apple only returns fullName on the first authorization. Save it to
      // the Firebase user profile so later sessions still have a name.
      const fullName = appleCredential.fullName;
      if (fullName && (fullName.givenName || fullName.familyName)) {
        const displayName = [fullName.givenName, fullName.familyName]
          .filter(Boolean)
          .join(' ');
        if (displayName && result.user?.updateProfile) {
          try {
            await result.user.updateProfile({ displayName });
          } catch (profileErr) {
            console.warn('Apple displayName update failed:', profileErr?.message);
          }
        }
      }

      console.log('Apple sign-in complete. Auth state listener will handle navigation.');
    } catch (e) {
      // User cancelled
      if (
        e?.code === 'ERR_REQUEST_CANCELED' ||
        e?.code === 'ERR_CANCELED' ||
        e?.code === '1001'
      ) {
        console.log('User cancelled Apple Sign-In');
        return;
      }

      logAuthError('signInWithApple', e);

      // Always show a friendly message; never leak the raw Firebase error.
      let title = t('auth.appleSignInFailed') || 'Apple Sign-In Failed';
      let message = 'Something went wrong signing in with Apple. Please try again.';
      const code = e?.code || '';
      if (code === 'auth/timeout') {
        message = 'Apple did not respond in time. Check your internet connection and try again.';
      } else if (code === 'auth/invalid-credential') {
        message = 'Your Apple Sign-In session expired. Please tap Sign in with Apple again.';
      } else if (code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with this email under a different sign-in method.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection and try again.';
      } else if (code === 'apple/no-identity-token') {
        message = 'Apple did not return a valid credential. Please try again.';
      } else if (code === 'apple/provider-missing') {
        message = 'This build does not support Apple Sign-In. Please update the app.';
      }

      setError(`${code || 'error'}: ${e?.message || ''}`);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
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
          <TouchableOpacity
            style={styles.logoCircle}
            activeOpacity={1}
            // Long-press is a hidden diagnostics escape hatch: dumps the
            // last-50 auth-flow breadcrumbs from AsyncStorage into an
            // Alert. Useful when iOS phone auth crashes natively and the
            // crash is otherwise opaque. No visible UI change.
            onLongPress={async () => {
              try {
                const raw = (await AsyncStorage.getItem('authBreadcrumbs')) || '[]';
                const lastError = (await AsyncStorage.getItem('authLastError')) || '(none)';
                const lastStep = (await AsyncStorage.getItem('lastPhoneAuthStep')) || '(none)';
                let breadcrumbs;
                try { breadcrumbs = JSON.parse(raw); } catch { breadcrumbs = []; }
                const summary = (breadcrumbs.slice(-10) || [])
                  .map((b) => `${b.at?.slice(11, 19)} ${b.step}`)
                  .join('\n');
                Alert.alert(
                  'Auth diagnostics',
                  `LAST STEP BEFORE CRASH:\n${lastStep}\n\nLast error:\n${lastError.slice(0, 200)}\n\nLast 10 steps:\n${summary || '(none)'}`,
                  [
                    { text: 'Clear', onPress: async () => {
                      await AsyncStorage.multiRemove(['authBreadcrumbs', 'authLastError', 'lastPhoneAuthStep']);
                    } },
                    { text: 'OK' },
                  ]
                );
              } catch {}
            }}
            delayLongPress={1500}
          >
            <Image
              source={require('../../assets/branding/sabalist-icon-safe.png')}
              style={styles.logoImageLarge}
            />
          </TouchableOpacity>
          <Text style={styles.brandName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Auth Card */}
        <Card style={styles.authCard}>
          {/* Method tabs: Phone (primary) | Email — only shown when more
              than one method is available. On iOS Phone is disabled so we
              skip the tab row entirely and show Email directly. */}
          {PHONE_AUTH_ENABLED && (
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
          )}

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

              {Platform.OS === 'ios' && AppleAuthentication && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={RADIUS.md}
                  style={styles.appleButton}
                  onPress={signInWithApple}
                />
              )}
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

              {Platform.OS === 'ios' && AppleAuthentication && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={RADIUS.md}
                  style={styles.appleButton}
                  onPress={signInWithApple}
                />
              )}
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

                {PHONE_AUTH_ENABLED && (
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
                )}
              </View>
            </>
          )}

          {/* Invisible reCAPTCHA container — web only, required by Firebase
              phone auth. RN-Web maps nativeID -> id. */}
          {Platform.OS === 'web' && (
            <View nativeID="recaptcha-container" style={styles.recaptcha} />
          )}

          {Platform.OS === 'ios' && PHONE_AUTH_ENABLED && (
            <PhoneAuthWebView
              phoneNumber={webViewPhone}
              onResult={handleWebViewResult}
              onClose={() => {
                setWebViewPhone(null);
                setLoading(false);
              }}
            />
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
  appleButton: {
    height: 50,
    width: '100%',
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
});
