import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, SHADOWS } from '../theme';

export default function TermsPrivacyScreen({ navigation }) {
  const { t } = useTranslation();

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
          <Text style={styles.sectionTitle}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

          <Text style={styles.paragraph}>
            Welcome to Sabalist, Africa's community marketplace. By using our service, you agree to these terms.
          </Text>

          <Text style={styles.subheading}>1. Acceptable Use</Text>
          <Text style={styles.paragraph}>
            You agree to use Sabalist for lawful purposes only. You may not:
          </Text>
          <Text style={styles.bulletPoint}>• Post false or misleading listings</Text>
          <Text style={styles.bulletPoint}>• Sell prohibited or illegal items</Text>
          <Text style={styles.bulletPoint}>• Harass or spam other users</Text>
          <Text style={styles.bulletPoint}>• Violate intellectual property rights</Text>

          <Text style={styles.subheading}>2. Listing Guidelines</Text>
          <Text style={styles.paragraph}>
            All listings must be accurate and include clear photos. Sellers are responsible for the accuracy of their listings and must honor all sales made through the platform.
          </Text>

          <Text style={styles.subheading}>3. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            Users are responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Maintaining account security</Text>
          <Text style={styles.bulletPoint}>• Providing accurate information</Text>
          <Text style={styles.bulletPoint}>• Communicating promptly with buyers/sellers</Text>
          <Text style={styles.bulletPoint}>• Resolving disputes in good faith</Text>

          <Text style={styles.subheading}>4. Payments and Fees</Text>
          <Text style={styles.paragraph}>
            Sabalist is currently free to use. We reserve the right to introduce fees for premium features in the future with advance notice to users.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

          <Text style={styles.paragraph}>
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </Text>

          <Text style={styles.subheading}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide when:
          </Text>
          <Text style={styles.bulletPoint}>• Creating an account (email, phone number)</Text>
          <Text style={styles.bulletPoint}>• Posting listings (photos, descriptions, contact info)</Text>
          <Text style={styles.bulletPoint}>• Using the app (device info, usage data)</Text>

          <Text style={styles.subheading}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use your information to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
          <Text style={styles.bulletPoint}>• Connect buyers and sellers</Text>
          <Text style={styles.bulletPoint}>• Send important updates</Text>
          <Text style={styles.bulletPoint}>• Prevent fraud and abuse</Text>

          <Text style={styles.subheading}>Data Protection</Text>
          <Text style={styles.paragraph}>
            We implement security measures to protect your data. However, no method of transmission over the internet is 100% secure. We encourage users to use strong passwords and keep their login credentials confidential.
          </Text>

          <Text style={styles.subheading}>Sharing Your Information</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. We may share your information:
          </Text>
          <Text style={styles.bulletPoint}>• With other users when you post listings</Text>
          <Text style={styles.bulletPoint}>• When required by law</Text>
          <Text style={styles.bulletPoint}>• To prevent fraud or abuse</Text>

          <Text style={styles.subheading}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Request data deletion</Text>
          <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Update your information</Text>

          <Text style={styles.subheading}>Contact Us</Text>
          <Text style={styles.paragraph}>
            For questions about these terms or our privacy practices, contact us at support@sabalist.com
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Questions about our terms or privacy policy?
          </Text>
          <Text style={styles.footerContact}>
            Contact us at support@sabalist.com
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
