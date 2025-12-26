import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = auth.currentUser;
  
  console.log('📱 ProfileScreen rendered');
  console.log('👤 Current user:', user ? user.phoneNumber : 'No user');

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('profile.confirmSignOut'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Signing out user...');
              await signOut(auth);
              console.log('✅ User signed out successfully!');
              Alert.alert('✅ Signed Out', 'You have been signed out successfully');
            } catch (error) {
              console.error('❌ Sign out error:', error);
              Alert.alert(
                t('common.error'), 
                t('profile.signOutFailed') + '\n\n' + error.message
              );
            }
          },
        },
      ]
    );
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
    <SafeAreaView style={styles.container}>
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
              onPress={() => Alert.alert(t('common.comingSoon'), t('profile.editProfileSoon'))}
              color={COLORS.primary}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="notifications-outline"
              title={t('profile.notifications')}
              subtitle={t('profile.notificationsDesc')}
              onPress={() => Alert.alert(t('common.comingSoon'), t('profile.notificationsSoon'))}
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
              onPress={() => Alert.alert(t('profile.help'), t('profile.helpContact'))}
              color={COLORS.info}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="document-text-outline"
              title={t('profile.termsPrivacy')}
              subtitle={t('profile.termsDesc')}
              onPress={() => Alert.alert(t('profile.termsPrivacy'), t('profile.termsMessage'))}
              color={COLORS.accent}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="information-circle-outline"
              title={t('profile.about')}
              subtitle={t('profile.version')}
              onPress={() => Alert.alert(t('profile.about'), t('profile.aboutMessage'))}
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
    </SafeAreaView>
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
