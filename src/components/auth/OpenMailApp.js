/**
 * OpenMailApp — buttons that jump the user straight to their mail app's
 * inbox so they don't have to background the app and hunt for the magic
 * link. Each provider gets two attempts:
 *   1. Native app deep link (e.g. googlegmail://)  — only works if installed
 *   2. Web fallback (e.g. https://mail.google.com)  — always works
 *
 * Apple Mail is iOS-only (no Android equivalent for message://).
 * On web, we always use the https:// URL since there's no installed-app
 * concept in the browser.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS } from '../../theme';

const PROVIDERS = [
  {
    id: 'gmail',
    labelKey: 'auth.gmail',
    fallbackLabel: 'Gmail',
    icon: 'mail',
    color: '#EA4335',
    appUrl: Platform.select({ ios: 'googlegmail://', android: 'googlegmail://', default: null }),
    webUrl: 'https://mail.google.com',
  },
  {
    id: 'outlook',
    labelKey: 'auth.outlook',
    fallbackLabel: 'Outlook',
    icon: 'mail',
    color: '#0078D4',
    appUrl: 'ms-outlook://',
    webUrl: 'https://outlook.live.com/mail',
  },
  {
    id: 'yahoo',
    labelKey: 'auth.yahoo',
    fallbackLabel: 'Yahoo Mail',
    icon: 'mail',
    color: '#6001D2',
    appUrl: 'ymail://',
    webUrl: 'https://mail.yahoo.com',
  },
  {
    id: 'appleMail',
    labelKey: 'auth.appleMail',
    fallbackLabel: 'Apple Mail',
    icon: 'mail',
    color: '#000000',
    appUrl: 'message://',
    webUrl: null,
    iosOnly: true,
  },
];

export default function OpenMailApp() {
  const { t } = useTranslation();

  const handlePress = async (provider) => {
    try {
      // On web there's no installed-app concept — go straight to the web URL.
      if (Platform.OS === 'web') {
        if (provider.webUrl) {
          window.open(provider.webUrl, '_blank', 'noopener');
        }
        return;
      }

      // Native: try the deep link; fall back to the web URL if not installed.
      if (provider.appUrl) {
        const supported = await Linking.canOpenURL(provider.appUrl);
        if (supported) {
          await Linking.openURL(provider.appUrl);
          return;
        }
      }

      if (provider.webUrl) {
        await Linking.openURL(provider.webUrl);
      }
    } catch (err) {
      console.warn('Could not open mail app:', err.message);
    }
  };

  const visibleProviders = PROVIDERS.filter((p) => {
    if (p.iosOnly && Platform.OS !== 'ios') return false;
    // On non-iOS native + web, only show providers that have a web URL.
    if (Platform.OS === 'web' && !p.webUrl) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.openMailApp') || 'Open Mail App'}</Text>
      <View style={styles.row}>
        {visibleProviders.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.btn}
            onPress={() => handlePress(p)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${p.color}15` }]}>
              <Ionicons name={p.icon} size={20} color={p.color} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {t(p.labelKey) !== p.labelKey ? t(p.labelKey) : p.fallbackLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  btn: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    flexShrink: 1,
  },
});
