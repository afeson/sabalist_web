import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../theme';

export default function TermsPrivacyScreen({ navigation }) {
  const { t, i18n } = useTranslation();
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.termsPrivacy')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('terms.termsOfService')}</Text>
          <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>

          <Text style={styles.paragraph}>
            {t('terms.termsIntro')}
          </Text>

          <Text style={styles.subheading}>{t('terms.acceptableUse')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.acceptableUseDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.acceptableUse1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.acceptableUse2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.acceptableUse3')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.acceptableUse4')}</Text>

          <Text style={styles.subheading}>{t('terms.listingGuidelines')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.listingGuidelinesDesc')}
          </Text>

          <Text style={styles.subheading}>{t('terms.userResponsibilities')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.userResponsibilitiesDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.responsibility1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.responsibility2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.responsibility3')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.responsibility4')}</Text>

          <Text style={styles.subheading}>{t('terms.paymentsFees')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.paymentsFeesDesc')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('terms.privacyPolicy')}</Text>
          <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>

          <Text style={styles.paragraph}>
            {t('terms.privacyIntro')}
          </Text>

          <Text style={styles.subheading}>{t('terms.infoWeCollect')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.infoWeCollectDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.infoCollect1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.infoCollect2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.infoCollect3')}</Text>

          <Text style={styles.subheading}>{t('terms.howWeUse')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.howWeUseDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.useInfo1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.useInfo2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.useInfo3')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.useInfo4')}</Text>

          <Text style={styles.subheading}>{t('terms.dataProtection')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.dataProtectionDesc')}
          </Text>

          <Text style={styles.subheading}>{t('terms.sharingInfo')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.sharingInfoDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.sharing1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.sharing2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.sharing3')}</Text>

          <Text style={styles.subheading}>{t('terms.yourRights')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.yourRightsDesc')}
          </Text>
          <Text style={styles.bulletPoint}>• {t('terms.right1')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.right2')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.right3')}</Text>
          <Text style={styles.bulletPoint}>• {t('terms.right4')}</Text>

          <Text style={styles.subheading}>{t('terms.contactUs')}</Text>
          <Text style={styles.paragraph}>
            {t('terms.contactUsDesc')}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('terms.questions')}
          </Text>
          <Text style={styles.footerContact}>
            {t('terms.contactSupport')}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
    padding: SPACING.base,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.base,
    fontStyle: 'italic',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: SPACING.base,
    marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
    paddingLeft: SPACING.base,
    marginBottom: SPACING.xs / 2,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.cardBorder,
    marginVertical: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  footerContact: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
  },
});
