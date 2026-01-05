import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Card } from '../components/ui';
import { getFirebase } from '../lib/firebaseFactory';

export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    messageNotifications: false,
    listingUpdates: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const fb = getFirebase();
      const userId = fb.auth.currentUser?.uid;

      if (!userId) {
        console.warn('No user logged in');
        setLoading(false);
        return;
      }

      console.log('📖 Loading notification settings for user:', userId);
      const userDoc = await fb.getDoc(fb.doc(fb.firestore, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSettings({
          emailNotifications: userData.emailNotifications ?? false,
          pushNotifications: userData.pushNotifications ?? false,
          messageNotifications: userData.messageNotifications ?? false,
          listingUpdates: userData.listingUpdates ?? false
        });
        console.log('✅ Settings loaded:', userData);
      } else {
        console.log('ℹ️ No settings found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    const fb = getFirebase();
    const userId = fb.auth.currentUser?.uid;

    if (!userId) {
      Alert.alert('Error', 'Please sign in to update settings');
      return;
    }

    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      console.log(`💾 Updating ${key} to ${value} for user:`, userId);
      await fb.updateDoc(fb.doc(fb.firestore, 'users', userId), {
        [key]: value,
        updatedAt: new Date()
      });
      console.log(`✅ Updated ${key} to ${value}`);
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      setSettings(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive updates about your listings via email
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
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get instant alerts on your device
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
                <Text style={styles.settingTitle}>Message Notifications</Text>
                <Text style={styles.settingDescription}>
                  Alerts when buyers contact you
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
                <Text style={styles.settingTitle}>Listing Updates</Text>
                <Text style={styles.settingDescription}>
                  Status changes on your listings
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
            Changes are saved automatically
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
});
