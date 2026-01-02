import React, { useState } from 'react';
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

// Platform-aware Firebase imports
let auth;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  auth = firebaseWeb.auth;
} else {
  const firebaseNative = require('../lib/firebase');
  auth = firebaseNative.auth;
}
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';
import Input from '../components/Input';

export default function PhoneOTPScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if platform is web - block phone auth entirely on web
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';

  async function send() {
    // Safety check - should never be called on web due to UI blocking
    if (isWeb || isIOS) {
      return;
    }

    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('validation.enterPhone'));
      return;
    }

    // Validate phone format
    if (!phone.startsWith('+')) {
      Alert.alert(
        t('validation.invalidFormat'),
        t('validation.phoneFormatHint')
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('📱 Attempting to send OTP to:', phone);
      console.log('🔥 Using @react-native-firebase/auth');
      console.log('🌐 Platform:', Platform.OS);

      // Send verification code using native Firebase SDK
      // Android uses automatic SafetyNet verification (no reCAPTCHA needed)
      const confirmationResult = await auth().signInWithPhoneNumber(phone);

      console.log('✅ OTP sent successfully!');
      console.log('📱 Confirmation result received');

      setConfirm(confirmationResult);
      setLoading(false);

      Alert.alert(
        t('auth.smsSent'),
        t('auth.codeSentTo', { phone }) + '\n\n' + t('auth.checkMessages')
      );
    } catch (e) {
      setLoading(false);

      // Comprehensive error logging
      console.error('❌ Phone Auth Error:', {
        code: e.code,
        message: e.message,
        name: e.name,
        phone: phone,
        platform: Platform.OS,
      });

      // User-friendly error messages
      let errorMessage = e.message;
      let errorTitle = 'Authentication Error';

      if (e.code === 'auth/invalid-phone-number') {
        errorTitle = 'Invalid Phone Number';
        errorMessage = 'Please enter a valid phone number with country code (e.g., +1 555 123 4567 for US)';
      } else if (e.code === 'auth/missing-phone-number') {
        errorTitle = 'Phone Number Required';
        errorMessage = 'Please enter your phone number';
      } else if (e.code === 'auth/quota-exceeded') {
        errorTitle = 'SMS Quota Exceeded';
        errorMessage = 'Too many SMS attempts. Please try again later or contact support.';
      } else if (e.code === 'auth/captcha-check-failed') {
        errorTitle = 'Verification Failed';
        errorMessage = 'reCAPTCHA verification failed. Please refresh and try again.';
      } else if (e.code === 'auth/too-many-requests') {
        errorTitle = 'Too Many Attempts';
        errorMessage = 'Too many requests from this device. Please try again later.';
      } else if (e.code === 'auth/invalid-app-credential') {
        errorTitle = 'Configuration Error';
        if (Platform.OS === 'android') {
          errorMessage = 'Android app not properly configured in Firebase. SHA-1 fingerprint and google-services.json are required. Please contact support.';
        } else if (Platform.OS === 'ios') {
          errorMessage = 'iOS app not properly configured in Firebase. GoogleService-Info.plist and APNs certificates are required. Please contact support.';
        } else {
          errorMessage = 'Firebase is not properly configured for this platform. Please contact support.';
        }
      } else if (e.message.includes('reCAPTCHA')) {
        errorTitle = 'reCAPTCHA Error';
        errorMessage = 'Security verification failed. Please refresh the page and try again.';
      }

      setError(`${e.code}: ${e.message}`);

      Alert.alert(
        errorTitle,
        errorMessage + '\n\n' + `Error: ${e.code}`,
        [
          { text: 'Copy Error', onPress: () => console.log('Error details:', e) },
          { text: 'OK' }
        ]
      );
    }
  }

  async function verify() {
    // Safety check - should never be called on web due to UI blocking
    if (isWeb || isIOS) {
      return;
    }

    if (!code.trim()) {
      Alert.alert(t('common.error'), t('validation.enterCode'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔐 Verifying code...');

      await confirm.confirm(code);

      console.log('✅ Code verified successfully!');
      console.log('✅ User signed in!');

      setLoading(false);
    } catch (e) {
      setLoading(false);

      console.error('❌ Verification Error:', {
        code: e.code,
        message: e.message,
      });

      let errorMessage = 'Invalid verification code. Please try again.';

      if (e.code === 'auth/invalid-verification-code') {
        errorMessage = 'The code you entered is incorrect. Please check and try again.';
      } else if (e.code === 'auth/code-expired') {
        errorMessage = 'This code has expired. Please request a new one.';
      }

      setError(`${e.code}: ${e.message}`);

      Alert.alert(
        'Verification Failed',
        errorMessage + '\n\n' + `Error: ${e.code}`
      );
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
          {isWeb || isIOS ? (
            // Platform Blocked - Web or iOS
            <View style={styles.welcomeSection}>
              <View style={styles.platformBlockedIcon}>
                <Ionicons name="phone-portrait-outline" size={64} color={COLORS.textMuted} />
              </View>
              <Text style={styles.welcomeTitle}>
                {isWeb ? 'Mobile App Required' : 'Platform Not Supported'}
              </Text>
              <Text style={[styles.welcomeText, { textAlign: 'center', marginTop: SPACING.md }]}>
                {isWeb
                  ? 'Phone verification is only available on the mobile app.\n\nPlease download and install the Android app to continue.'
                  : 'Phone authentication requires the Android app.\n\niOS support requires additional APNs configuration.'
                }
              </Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.infoText}>
                  {isWeb
                    ? 'Firebase Phone Authentication does not work in web browsers. Please use the Android app.'
                    : 'See FIREBASE_PHONE_AUTH_SETUP.md for iOS setup instructions.'
                  }
                </Text>
              </View>
            </View>
          ) : (
            // Android - Phone Auth Enabled
            <>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>
                  {confirm ? t('auth.verify') : t('auth.welcome')}
                </Text>
                <Text style={styles.welcomeText}>
                  {confirm
                    ? t('auth.enterCode')
                    : t('auth.signInMessage')
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

              {!confirm ? (
                <>
                  <View style={styles.phoneHint}>
                    <Ionicons name="information-circle" size={16} color={COLORS.info} />
                    <Text style={styles.hintText}>
                      Start with country code: +1 (US), +234 (Nigeria), +254 (Kenya), +251 (Ethiopia)
                    </Text>
                  </View>

                  <Input
                    label={t('auth.phoneLabel')}
                    value={phone}
                    onChangeText={(text) => {
                      console.log('📱 Phone number changed:', text);
                      setPhone(text);
                    }}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    showClear={true}
                    editable={!loading}
                  />
                  <PrimaryButton
                    title={t('auth.sendOTP')}
                    onPress={send}
                    loading={loading}
                    disabled={loading}
                    size="large"
                  />
                </>
              ) : (
                <>
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    <Text style={styles.successText}>
                      Code sent to {phone}
                    </Text>
                  </View>

                  <Input
                    label={t('auth.codeLabel')}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <PrimaryButton
                    title={t('auth.verify')}
                    onPress={verify}
                    loading={loading}
                    disabled={loading}
                    size="large"
                  />
                  <PrimaryButton
                    title={t('auth.resendCode')}
                    onPress={send}
                    variant="outline"
                    size="medium"
                    style={styles.resendButton}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="shield-checkmark"
            title={t('features.secure')}
            description={t('features.secureDesc')}
            color={COLORS.success}
          />
          <FeatureItem
            icon="flash"
            title={t('features.fast')}
            description={t('features.fastDesc')}
            color={COLORS.accent}
          />
          <FeatureItem
            icon="people"
            title={t('features.community')}
            description={t('features.communityDesc')}
            color={COLORS.secondary}
          />
        </View>

        {/* Debug Info (remove in production) */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔍 Debug Info:</Text>
          <Text style={styles.debugText}>Firebase: @react-native-firebase (Native SDK)</Text>
          <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
          <Text style={styles.debugText}>Config: google-services.json</Text>
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
  phoneHint: {
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
  resendButton: {
    marginTop: SPACING.md,
  },
  platformBlockedIcon: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.info}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
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
