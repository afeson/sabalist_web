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
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS } from '../theme/premiumTheme';
import LanguageModal from './LanguageModal';

export default function AppHeader({ navigation }) {
  const { i18n } = useTranslation();
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
      <View style={styles.safeAreaTop} />
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
          <Ionicons name="globe" size={22} color={PREMIUM_COLORS.accent} />
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
    height: 90,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.sm,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: PREMIUM_COLORS.text,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.xs,
    backgroundColor: PREMIUM_COLORS.card,
    paddingHorizontal: PREMIUM_SPACING.md,
    paddingVertical: PREMIUM_SPACING.sm,
    borderRadius: PREMIUM_RADIUS.full,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border,
  },
  languageCode: {
    fontSize: 13,
    fontWeight: '700',
    color: PREMIUM_COLORS.accent,
  },
});
