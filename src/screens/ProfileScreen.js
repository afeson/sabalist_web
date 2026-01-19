import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';

export default function ProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [, forceUpdate] = useState(0);

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
              subtitle={t('profile.version')}
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
});
