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
          <Text style={styles.appName}>Sabalist</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
          <Text style={styles.version}>Version 1.1.0</Text>
        </View>

        {/* About Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>About Sabalist</Text>
          <Text style={styles.paragraph}>
            Sabalist is Africa's premier community marketplace, connecting buyers and sellers across the continent. We're building a trusted platform where people can buy, sell, and trade with confidence.
          </Text>
          <Text style={styles.paragraph}>
            Our mission is to empower African entrepreneurs and make commerce accessible to everyone, from local artisans to growing businesses.
          </Text>
        </Card>

        {/* Features Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>What We Offer</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Safe & Secure</Text>
              <Text style={styles.featureDescription}>
                Your safety is our priority. We verify users and monitor listings.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="flash" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Fast & Easy</Text>
              <Text style={styles.featureDescription}>
                Create listings in minutes. Connect with buyers instantly.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Community-Driven</Text>
              <Text style={styles.featureDescription}>
                Built by Africans, for Africans. Join thousands of active users.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="pricetag" size={24} color={COLORS.info} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Free to Use</Text>
              <Text style={styles.featureDescription}>
                No listing fees. No hidden charges. Just pure marketplace access.
              </Text>
            </View>
          </View>
        </Card>

        {/* Tech Stack Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Technology</Text>
          <Text style={styles.paragraph}>
            Built with modern, reliable technology:
          </Text>
          <Text style={styles.techItem}>• React Native for cross-platform mobile</Text>
          <Text style={styles.techItem}>• Firebase for real-time data & auth</Text>
          <Text style={styles.techItem}>• Expo for streamlined development</Text>
          <Text style={styles.techItem}>• Optimized for African networks</Text>
        </Card>

        {/* Contact Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.paragraph}>
            We'd love to hear from you!
          </Text>

          <View style={styles.contactRow}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>support@sabalist.com</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="globe" size={20} color={COLORS.primary} />
            <Text style={styles.contactText}>www.sabalist.com</Text>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ in Africa
          </Text>
          <Text style={styles.copyrightText}>
            © 2024 Sabalist. All rights reserved.
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
