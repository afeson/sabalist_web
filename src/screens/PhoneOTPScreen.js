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
      let errorTitle = t('auth.authError');

      if (e.code === 'auth/invalid-phone-number') {
        errorTitle = t('auth.invalidPhoneNumber');
        errorMessage = t('auth.invalidPhoneMessage');
      } else if (e.code === 'auth/missing-phone-number') {
        errorTitle = t('auth.phoneRequiredTitle');
        errorMessage = t('auth.phoneRequiredMessage');
      } else if (e.code === 'auth/quota-exceeded') {
        errorTitle = t('auth.smsQuotaExceeded');
        errorMessage = t('auth.smsQuotaMessage');
      } else if (e.code === 'auth/captcha-check-failed') {
        errorTitle = t('auth.verificationFailed');
        errorMessage = t('auth.recaptchaFailed');
      } else if (e.code === 'auth/too-many-requests') {
        errorTitle = t('auth.tooManyAttempts');
        errorMessage = t('auth.tooManyAttemptsMessage');
      } else if (e.code === 'auth/invalid-app-credential') {
        errorTitle = t('auth.configError');
        if (Platform.OS === 'android') {
          errorMessage = t('auth.androidConfigError');
        } else if (Platform.OS === 'ios') {
          errorMessage = t('auth.iosConfigError');
        } else {
          errorMessage = t('auth.genericConfigError');
        }
      } else if (e.message.includes('reCAPTCHA')) {
        errorTitle = t('auth.recaptchaError');
        errorMessage = t('auth.recaptchaErrorMessage');
      }

      setError(`${e.code}: ${e.message}`);

      Alert.alert(
        errorTitle,
        errorMessage + '\n\n' + `Error: ${e.code}`,
        [
          { text: t('auth.copyError'), onPress: () => console.log('Error details:', e) },
          { text: t('common.ok') }
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

      let errorMessage = t('auth.invalidCode');

      if (e.code === 'auth/invalid-verification-code') {
        errorMessage = t('auth.incorrectCode');
      } else if (e.code === 'auth/code-expired') {
        errorMessage = t('auth.codeExpired');
      }

      setError(`${e.code}: ${e.message}`);

      Alert.alert(
        t('auth.verificationFailed'),
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
                {isWeb ? t('auth.mobileAppRequired') : t('auth.platformNotSupported')}
              </Text>
              <Text style={[styles.welcomeText, { textAlign: 'center', marginTop: SPACING.md }]}>
                {isWeb
                  ? t('auth.mobileAppRequiredMessage')
                  : t('auth.iosNotSupportedMessage')
                }
              </Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.infoText}>
                  {isWeb
                    ? t('auth.webPhoneAuthNote')
                    : t('auth.iosSetupNote')
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
                      {t('auth.phoneHint')}
                    </Text>
                  </View>

                  <Input
                    label={t('auth.phoneLabel')}
                    value={phone}
                    onChangeText={(text) => {
                      console.log('📱 Phone number changed:', text);
                      setPhone(text);
                    }}
                    placeholder={t('auth.phonePlaceholder')}
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
                      {t('auth.codeSentToPhone', { phone })}
                    </Text>
                  </View>

                  <Input
                    label={t('auth.codeLabel')}
                    value={code}
                    onChangeText={setCode}
                    placeholder={t('auth.codePlaceholder') || '123456'}
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
