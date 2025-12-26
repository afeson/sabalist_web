import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../lib/i18n';
import { COLORS } from '../theme';

export default function LanguageSwitcher({ onClose }) {
  const { t, i18n } = useTranslation();
  const [changing, setChanging] = useState(false);

  const handleLanguageChange = async (languageCode) => {
    if (changing) return;
    
    setChanging(true);
    console.log('User selected language:', languageCode);
    
    const selectedLang = LANGUAGES.find(l => l.code === languageCode);
    const success = await changeLanguage(languageCode);
    
    if (success) {
      console.log('Language change successful, current language:', i18n.language);
      
      // Show confirmation
      Alert.alert(
        '✅ ' + (selectedLang?.nativeName || languageCode.toUpperCase()),
        'Language changed to ' + (selectedLang?.name || languageCode) + '!',
        [{ text: 'OK', onPress: () => {} }]
      );
      
      // Close modal after a brief delay
      if (onClose) {
        setTimeout(() => {
          onClose();
          setChanging(false);
        }, 500);
      }
    } else {
      Alert.alert('Error', 'Failed to change language');
      setChanging(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {LANGUAGES.map((language) => {
        const isSelected = language.code === i18n.language;
        return (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageItem,
              isSelected && styles.languageItemSelected,
            ]}
            onPress={() => handleLanguageChange(language.code)}
          >
            <View style={styles.languageInfo}>
              <Text style={[styles.languageName, isSelected && styles.selectedText]}>
                {language.nativeName}
              </Text>
              <Text style={styles.languageEnglishName}>{language.name}</Text>
              {language.rtl && (
                <View style={styles.rtlBadge}>
                  <Text style={styles.rtlBadgeText}>RTL</Text>
                </View>
              )}
              {isSelected && (
                <View style={[styles.activeBadge, { backgroundColor: COLORS.success }]}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  languageItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedText: {
    color: '#10B981',
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#6B7280',
  },
  rtlBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rtlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
