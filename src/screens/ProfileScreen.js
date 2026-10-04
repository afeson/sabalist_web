import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';
import SEO from '../components/SEO';
import { deleteCurrentAccount } from '../services/deleteAccount';

export default function ProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [, forceUpdate] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // Force re-render when language changes (even if screen is already focused)
  useEffect(() => {
    console.log('📱 ProfileScreen language changed to:', i18n.language);
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  // Also re-render when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ProfileScreen focused, language:', i18n.language);
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  console.log('📱 ProfileScreen rendered');
  console.log('👤 Current user:', user ? (user.phoneNumber || user.email) : 'No user');

  // Account deletion: required by App Store guideline 5.1.1(v). Two-step
  // confirmation, then full deletion of the user's listings, favorites,
  // settings, profile doc, and Firebase Auth user.
  const performDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      console.log('PROFILE: deleting account');
      await deleteCurrentAccount();
      console.log('PROFILE: account deleted — auth state listener will redirect');
      // Auth listener takes the user back to the sign-in screen
      // automatically when currentUser becomes null.
      if (Platform.OS === 'web') {
        window.alert(t('profile.deleteAccountDoneMessage') || 'Your account has been deleted.');
      } else {
        Alert.alert(
          t('profile.deleteAccountDone') || 'Account deleted',
          t('profile.deleteAccountDoneMessage') || 'Your account and all related data have been permanently deleted.'
        );
      }
    } catch (e) {
      console.error('PROFILE: deleteAccount error', e);
      if (e?.code === 'auth/requires-recent-login') {
        // Firebase requires a recent sign-in to delete the account. Sign
        // the user out so they can sign back in and immediately retry.
        const msg =
          t('profile.deleteRequiresRecentLogin') ||
          'For your security, please sign in again, then try deleting your account.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert(t('profile.deleteAccount') || 'Sign in required', msg, [
            { text: 'OK', onPress: () => logout().catch(() => {}) },
          ]);
        }
      } else {
        const generic =
          t('profile.deleteAccountFailed') ||
          'Could not delete your account. Please try again or contact support.';
        if (Platform.OS === 'web') {
          window.alert(generic + (e?.message ? `\n\n${e.message}` : ''));
        } else {
          Alert.alert(t('common.error') || 'Error', generic);
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleting) return;
    const title =
      t('profile.deleteAccount') !== 'profile.deleteAccount'
        ? t('profile.deleteAccount')
        : 'Delete account';
    const warning =
      t('profile.deleteAccountWarning') !== 'profile.deleteAccountWarning'
        ? t('profile.deleteAccountWarning')
        : 'This permanently deletes your account, all your listings, favorites, and profile. This cannot be undone.';
    const finalConfirm =
      t('profile.deleteAccountFinalConfirm') !== 'profile.deleteAccountFinalConfirm'
        ? t('profile.deleteAccountFinalConfirm')
        : 'Permanently delete your account?';

    // Two-step confirmation, per Apple's guidance (confirmation OK, but
    // do not require contacting support).
    if (Platform.OS === 'web') {
      if (!window.confirm(`${title}\n\n${warning}`)) return;
      if (!window.confirm(finalConfirm)) return;
      performDelete();
      return;
    }
    Alert.alert(title, warning, [
      { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      {
        text: t('profile.deleteAccountContinue') || 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert(title, finalConfirm, [
            { text: t('common.cancel') || 'Cancel', style: 'cancel' },
            {
              text: t('profile.deleteAccountConfirm') || 'Delete forever',
              style: 'destructive',
              onPress: performDelete,
            },
          ]);
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    // On web, use window.confirm since Alert.alert doesn't work
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('profile.confirmSignOut'));
      if (!confirmed) {
        console.log('PROFILE: Sign out cancelled');
        return;
      }
    }

    try {
      console.log('PROFILE: Logout initiated');
      await logout();
      console.log('PROFILE: Logout completed - AuthContext will handle redirect');
    } catch (error) {
      console.error('PROFILE: Logout error', error);
      if (Platform.OS === 'web') {
        window.alert(t('profile.signOutFailed') + '\n\n' + error.message);
      }
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, color = COLORS.textDark }) => {
    const handlePress = () => {
      console.log('🔘 Menu item clicked:', title);
      if (onPress) {
        onPress();
      } else {
        console.warn('⚠️ No onPress handler for:', title);
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SEO title="Profile" noIndex />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={COLORS.card} />
            </View>
          </View>
          <Text style={styles.userName}>
            {t('profile.sabalistUser')}
          </Text>
          <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
        </Card>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title={t('profile.editProfile')}
              subtitle={t('profile.editProfileDesc')}
              onPress={() => {
                console.log('✅ Navigating to EditProfile');
                navigation.navigate('EditProfile');
              }}
              color={COLORS.primary}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="notifications-outline"
              title={t('profile.notifications')}
              subtitle={t('profile.notificationsDesc')}
              onPress={() => {
                console.log('✅ Navigating to Notifications');
                navigation.navigate('Notifications');
              }}
              color={COLORS.secondary}
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="help-circle-outline"
              title={t('profile.help')}
              subtitle={t('profile.helpDesc')}
              onPress={() => {
                console.log('✅ Navigating to HelpSupport');
                navigation.navigate('HelpSupport');
              }}
              color={COLORS.info}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="document-text-outline"
              title={t('profile.termsPrivacy')}
              subtitle={t('profile.termsDesc')}
              onPress={() => {
                console.log('✅ Navigating to TermsPrivacy');
                navigation.navigate('TermsPrivacy');
              }}
              color={COLORS.accent}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="information-circle-outline"
              title={t('profile.about')}
              subtitle={`Version ${Constants.expoConfig?.version || '1.2.7'}`}
              onPress={() => {
                console.log('✅ Navigating to About');
                navigation.navigate('About');
              }}
              color={COLORS.textMuted}
            />
          </Card>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            console.log('🔴 Sign Out button clicked');
            handleSignOut();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>

        {/* Delete Account — required by App Store guideline 5.1.1(v).
            Placed in its own visually separate "Danger zone" so users
            can't tap it by mistake. */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerSectionTitle}>
            {t('profile.dangerZone') !== 'profile.dangerZone'
              ? t('profile.dangerZone')
              : 'Danger zone'}
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.deleteAccountText}>
                {deleting
                  ? t('profile.deletingAccount') !== 'profile.deletingAccount'
                    ? t('profile.deletingAccount')
                    : 'Deleting your account...'
                  : t('profile.deleteAccount') !== 'profile.deleteAccount'
                  ? t('profile.deleteAccount')
                  : 'Delete account'}
              </Text>
              <Text style={styles.deleteAccountSubtitle}>
                {t('profile.deleteAccountSubtitle') !== 'profile.deleteAccountSubtitle'
                  ? t('profile.deleteAccountSubtitle')
                  : 'Permanently delete your account and all your data'}
              </Text>
            </View>
          </TouchableOpacity>
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
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
    padding: SPACING.base,
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    marginBottom: SPACING.base,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginLeft: 80,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.error,
    marginTop: SPACING.lg,
  },
  signOutText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.error,
  },
  dangerSection: {
    marginTop: SPACING.xxl,
  },
  dangerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}10`,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 2,
  },
  deleteAccountSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
