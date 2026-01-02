import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import LanguageModal from './LanguageModal';

export default function MobileHeader({ onProfilePress, onSearch }) {
  const { i18n } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [showLanguage, setShowLanguage] = useState(false);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchText);
    }
  };

  return (
    <View style={styles.header}>
      {/* Top Row: Logo, Search, Profile */}
      <View style={styles.topRow}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../../assets/branding/sabalist-icon-safe.png')}
            style={styles.logoImage}
          />
          <Text style={styles.brandText}>Sabalist</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={i18n.t('common.search') + '...'}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Globe Icon for Language */}
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => setShowLanguage(true)}
        >
          <Ionicons name="globe" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Profile Avatar */}
        <TouchableOpacity 
          style={styles.avatarButton}
          onPress={onProfilePress}
        >
          <Ionicons name="person" size={20} color={COLORS.card} />
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <LanguageModal
        isVisible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  logoImage: {
    width: 120,
    height: 150,
    resizeMode: 'contain',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    fontFamily: 'System', // Will use Poppins/Nunito if available
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    padding: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.full,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

