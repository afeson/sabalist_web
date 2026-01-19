import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';

export default function HelpSupportScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [, forceUpdate] = useState(0);

  // Force re-render when screen comes into focus (handles language changes)
  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  const supportEmail = 'support@sabalist.com';

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${supportEmail}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.help')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Support */}
        <Card style={styles.card}>
          <View style={styles.iconHeader}>
            <Ionicons name="help-circle" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>{t('help.needHelp')}</Text>
          <Text style={styles.cardDescription}>
            {t('help.needHelpDesc')}
          </Text>
        </Card>

        {/* Email Support */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('help.contactUs')}</Text>

          <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t('help.emailSupport')}</Text>
              <Text style={styles.contactValue}>{supportEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Common Questions */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('help.commonQuestions')}</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('help.faq1Question')}</Text>
            <Text style={styles.faqAnswer}>
              {t('help.faq1Answer')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('help.faq2Question')}</Text>
            <Text style={styles.faqAnswer}>
              {t('help.faq2Answer')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('help.faq3Question')}</Text>
            <Text style={styles.faqAnswer}>
              {t('help.faq3Answer')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{t('help.faq4Question')}</Text>
            <Text style={styles.faqAnswer}>
              {t('help.faq4Answer')}
            </Text>
          </View>
        </Card>

        {/* Guidelines */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('help.communityGuidelines')}</Text>
          <Text style={styles.guidelinesText}>
            • {t('help.guideline1')}{'\n'}
            • {t('help.guideline2')}{'\n'}
            • {t('help.guideline3')}{'\n'}
            • {t('help.guideline4')}{'\n'}
            • {t('help.guideline5')}
          </Text>
        </Card>

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
  card: {
    marginBottom: SPACING.base,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.base,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.base,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs / 2,
  },
  contactValue: {
    fontSize: 14,
    color: COLORS.primary,
  },
  faqItem: {
    marginBottom: SPACING.base,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: SPACING.base,
  },
  guidelinesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 24,
  },
});
