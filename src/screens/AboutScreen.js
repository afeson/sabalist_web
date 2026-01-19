import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';

export default function AboutScreen({ navigation }) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.about')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Icon */}
        <View style={styles.iconSection}>
          <Image
            source={require('../../assets/branding/sabalist-icon-safe.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{t('about.appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
          <Text style={styles.version}>{t('about.version')}</Text>
        </View>

        {/* About Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about.aboutTitle')}</Text>
          <Text style={styles.paragraph}>
            {t('about.aboutDesc1')}
          </Text>
          <Text style={styles.paragraph}>
            {t('about.aboutDesc2')}
          </Text>
        </Card>

        {/* Features Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about.whatWeOffer')}</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('about.safeSecure')}</Text>
              <Text style={styles.featureDescription}>
                {t('about.safeSecureDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="flash" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('about.fastEasy')}</Text>
              <Text style={styles.featureDescription}>
                {t('about.fastEasyDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('about.communityDriven')}</Text>
              <Text style={styles.featureDescription}>
                {t('about.communityDrivenDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="pricetag" size={24} color={COLORS.info} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('about.freeToUse')}</Text>
              <Text style={styles.featureDescription}>
                {t('about.freeToUseDesc')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Tech Stack Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about.technology')}</Text>
          <Text style={styles.paragraph}>
            {t('about.techDesc')}
          </Text>
          <Text style={styles.techItem}>• {t('about.tech1')}</Text>
          <Text style={styles.techItem}>• {t('about.tech2')}</Text>
          <Text style={styles.techItem}>• {t('about.tech3')}</Text>
          <Text style={styles.techItem}>• {t('about.tech4')}</Text>
        </Card>

        {/* Contact Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about.getInTouch')}</Text>
          <Text style={styles.paragraph}>
            {t('about.getInTouchDesc')}
          </Text>

          <View style={styles.contactRow}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>{t('about.supportEmail')}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="globe" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>{t('about.website')}</Text>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('about.madeWithLove')}
          </Text>
          <Text style={styles.copyrightText}>
            {t('about.copyright')}
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
  iconSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  appIcon: {
    width: 100,
    height: 100,
    marginBottom: SPACING.base,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  version: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  card: {
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.base,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: SPACING.base,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs / 2,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  techItem: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 24,
    paddingLeft: SPACING.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  copyrightText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
