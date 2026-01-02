import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../lib/i18n';
import { COLORS, SPACING } from '../theme';

export default function LanguageSwitcher({ onClose, disableScroll = false }) {
  const { t, i18n } = useTranslation();
  const [changing, setChanging] = useState(false);
  const scrollViewRef = useRef(null);

  // Add scrollbar styling for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Target all ScrollView divs in the language modal */
        .language-switcher-scroll::-webkit-scrollbar {
          width: 10px !important;
        }
        .language-switcher-scroll::-webkit-scrollbar-track {
          background: #F3F4F6 !important;
          border-radius: 4px;
        }
        .language-switcher-scroll::-webkit-scrollbar-thumb {
          background: #9CA3AF !important;
          border-radius: 4px;
        }
        .language-switcher-scroll::-webkit-scrollbar-thumb:hover {
          background: #6B7280 !important;
        }
        .language-switcher-scroll {
          scrollbar-width: thin !important;
          scrollbar-color: #9CA3AF #F3F4F6 !important;
          overflow-y: auto !important;
        }
      `;
      document.head.appendChild(style);

      // Apply class to the scrollview element
      if (scrollViewRef.current) {
        const element = scrollViewRef.current;
        if (element._nativeTag || element) {
          // Find the actual DOM element
          const domElement = element.getScrollableNode ? element.getScrollableNode() : element;
          if (domElement && domElement.classList) {
            domElement.classList.add('language-switcher-scroll');
          }
        }
      }

      return () => document.head.removeChild(style);
    }
  }, []);

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

  // Render language list items
  const renderLanguageList = () => (
    <>
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
    </>
  );

  // If disableScroll is true (when used in BottomSheetScrollView), render without ScrollView
  if (disableScroll) {
    console.log('LanguageSwitcher: Rendering without ScrollView (disableScroll=true)');
    console.log('LanguageSwitcher: LANGUAGES count:', LANGUAGES.length);
    return (
      <View style={styles.scrollContent}>
        {renderLanguageList()}
      </View>
    );
  }

  // Otherwise render with ScrollView (standalone usage)
  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {renderLanguageList()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
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
