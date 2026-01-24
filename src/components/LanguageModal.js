import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../lib/i18n';
import { COLORS, SPACING } from '../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Tab bar heights for different platforms
const TAB_BAR_HEIGHT = Platform.select({
  ios: 85,
  web: 0, // On web, tabs are relative positioned (not absolute)
  default: 70,
});

export default function LanguageModal({ isVisible, onClose }) {
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [changing, setChanging] = useState(false);

  const handleLanguageChange = async (languageCode) => {
    if (changing) return;

    setChanging(true);
    const success = await changeLanguage(languageCode);

    if (success) {
      setChanging(false);
      onClose();
    } else {
      setChanging(false);
    }
  };

  // Calculate modal height - never exceed 70% of screen, leave space for tabs
  const modalHeight = Math.min(SCREEN_HEIGHT * 0.7, SCREEN_HEIGHT - 150);
  // Bottom padding: on mobile add tab bar height, on web add minimal spacing
  const bottomPadding = Platform.OS === 'web'
    ? 20
    : Math.max(insets.bottom, TAB_BAR_HEIGHT) + 16;

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <View
          style={[
            styles.modalContainer,
            {
              maxHeight: modalHeight,
              marginBottom: bottomPadding,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>
                  {t('profile.selectLanguage')}
                </Text>
                <Text style={styles.subtitle}>
                  {t('language.current', { language: i18n.language.toUpperCase() })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Language List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
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
                  disabled={changing}
                >
                  <View style={styles.languageInfo}>
                    <Text
                      style={[
                        styles.languageName,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {language.nativeName}
                    </Text>
                    <Text style={styles.languageEnglishName}>
                      {language.name}
                    </Text>
                    {language.rtl && (
                      <View style={styles.rtlBadge}>
                        <Text style={styles.rtlBadgeText}>{t('language.rtl')}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View
                        style={[
                          styles.activeBadge,
                          { backgroundColor: COLORS.success },
                        ]}
                      >
                        <Text style={styles.activeBadgeText}>{t('language.active')}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={COLORS.success}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
      },
    }),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 2,
    minHeight: 300,
    maxHeight: '80vh',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  closeButton: {
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E50914',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    maxHeight: 400,
  },
  scrollContent: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: 40,
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
