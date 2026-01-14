import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={COLORS.card} />
          </View>
          <TouchableOpacity style={styles.changePhotoButton} disabled>
            <Text style={styles.changePhotoText}>{t('common.comingSoon')}</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.accountInformation')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.emailPhone')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>
                {user?.email || user?.phoneNumber || t('profile.notAvailable')}
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.displayName')}</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder={t('profile.displayNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('profile.bio')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.disabledInput]}
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              editable={false}
            />
          </View>
        </Card>

        {/* Notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.noticeText}>
            {t('profile.editingComingSoon')}
          </Text>
        </View>

        {/* Save Button (Disabled) */}
        <TouchableOpacity style={styles.saveButton} disabled>
          <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
        </TouchableOpacity>

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
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  changePhotoButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.base,
  },
  changePhotoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  card: {
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.base,
  },
  field: {
    marginBottom: SPACING.base,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.textDark,
  },
  disabledInput: {
    opacity: 0.6,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.info,
  },
  saveButton: {
    backgroundColor: COLORS.textMuted,
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.card,
  },
});
