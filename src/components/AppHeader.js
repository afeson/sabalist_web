import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS } from '../theme/premiumTheme';
import LanguageModal from './LanguageModal';

export default function AppHeader({ navigation }) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showLanguage, setShowLanguage] = useState(false);

  const handleLogoPress = () => {
    if (navigation) {
      navigation.navigate('Home');
    }
  };

  const handleLanguagePress = () => {
    setShowLanguage(true);
  };

  const handleLanguageClose = () => {
    setShowLanguage(false);
  };

  return (
    <>
      <View style={[styles.safeAreaTop, { paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 0) }]} />
      <View style={styles.header}>
        {/* Left: Logo */}
        <TouchableOpacity
          style={styles.logoSection}
          onPress={handleLogoPress}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/branding/sabalist-icon-safe.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>Sabalist</Text>
        </TouchableOpacity>

        {/* Right: Language Switcher */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={handleLanguagePress}
          activeOpacity={0.7}
          testID="language-button"
        >
          <Ionicons name="globe-outline" size={18} color={PREMIUM_COLORS.accent} />
          <Text style={styles.languageCode}>{i18n.language.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Modal - Render outside header for proper z-index */}
      <LanguageModal
        isVisible={showLanguage}
        onClose={handleLanguageClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaTop: {
    backgroundColor: PREMIUM_COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PREMIUM_COLORS.bg,
    paddingHorizontal: PREMIUM_SPACING.lg,
    paddingVertical: PREMIUM_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
    height: 64,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 52,
    height: 52,
    shadowColor: PREMIUM_COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: PREMIUM_COLORS.text,
    letterSpacing: -0.3,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PREMIUM_COLORS.card,
    paddingHorizontal: PREMIUM_SPACING.sm,
    paddingVertical: PREMIUM_SPACING.xs,
    borderRadius: PREMIUM_RADIUS.full,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border,
    height: 32,
  },
  languageCode: {
    fontSize: 12,
    fontWeight: '700',
    color: PREMIUM_COLORS.accent,
  },
});
