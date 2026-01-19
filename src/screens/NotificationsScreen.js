import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';
import { getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function NotificationsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [, forceUpdate] = useState(0);

  // Force re-render when screen comes into focus (handles language changes)
  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    messageNotifications: false,
    listingUpdates: false
  });

  useEffect(() => {
    // Wait for auth to be ready before loading settings
    if (!authLoading) {
      loadSettings();
    }
  }, [authLoading, user]);

  const loadSettings = async () => {
    try {
      if (!user?.uid) {
        console.warn('⚠️ No user logged in');
        setLoading(false);
        return;
      }

      console.log('📖 Loading notification settings for user:', user.uid);
      const db = getFirestore();
      const docRef = doc(db, 'users', user.uid);
      console.log('📖 Document reference:', docRef);

      const userDoc = await getDoc(docRef);
      console.log('📖 Document exists?', userDoc.exists());

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('📖 User data:', userData);

        const loadedSettings = {
          emailNotifications: userData.emailNotifications ?? false,
          pushNotifications: userData.pushNotifications ?? false,
          messageNotifications: userData.messageNotifications ?? false,
          listingUpdates: userData.listingUpdates ?? false
        };

        console.log('✅ Settings loaded:', loadedSettings);
        setSettings(loadedSettings);
      } else {
        console.log('ℹ️ User document does not exist, creating with defaults');
        // Create user document with default settings
        const defaultSettings = {
          emailNotifications: false,
          pushNotifications: false,
          messageNotifications: false,
          listingUpdates: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(docRef, defaultSettings);
          console.log('✅ User document created with defaults');
          setSettings({
            emailNotifications: false,
            pushNotifications: false,
            messageNotifications: false,
            listingUpdates: false
          });
        } catch (err) {
          console.warn('⚠️ Could not create user document:', err.message);
        }
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      Alert.alert(t('common.error'), t('notifications.loadFailed', { message: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    if (!user?.uid) {
      Alert.alert(t('common.error'), t('notifications.signInToUpdate'));
      return;
    }

    // Optimistically update UI
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      console.log(`💾 Updating ${key} to ${value} for user:`, user.uid);
      const db = getFirestore();
      const docRef = doc(db, 'users', user.uid);

      // Use serverTimestamp for consistency
      const updateData = {
        [key]: value,
        updatedAt: serverTimestamp()
      };

      console.log('💾 Update data:', updateData);
      await updateDoc(docRef, updateData);

      console.log(`✅ Successfully updated ${key} to ${value} in Firestore`);
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      // Revert UI state on error
      setSettings(prev => ({ ...prev, [key]: !value }));
      Alert.alert(t('common.error'), t('notifications.updateFailed', { message: error.message }));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {authLoading ? t('notifications.authenticating') : t('notifications.loadingSettings')}
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{t('notifications.signInRequired')}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('notifications.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.notifications')}</Text>
        <View style={{ width: 24 }}>
          {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Settings */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('notifications.preferences')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('notifications.email')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.emailDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={(value) => updateSetting('emailNotifications', value)}
              disabled={saving}
              trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('notifications.push')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.pushDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(value) => updateSetting('pushNotifications', value)}
              disabled={saving}
              trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('notifications.messages')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.messagesDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.messageNotifications}
              onValueChange={(value) => updateSetting('messageNotifications', value)}
              disabled={saving}
              trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="pricetag-outline" size={24} color={COLORS.info} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{t('notifications.listingUpdates')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.listingUpdatesDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.listingUpdates}
              onValueChange={(value) => updateSetting('listingUpdates', value)}
              disabled={saving}
              trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
            />
          </View>
        </Card>

        {/* Info Notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.noticeText}>
            {t('notifications.autoSave')}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.base,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.base,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs / 2,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: SPACING.sm,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.info,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
});
