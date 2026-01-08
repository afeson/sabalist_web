import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations - ALL 12 LANGUAGES
import en from '../locales/en/translation.json';
import fr from '../locales/fr/translation.json';
import ar from '../locales/ar/translation.json';
import sw from '../locales/sw/translation.json';
import pt from '../locales/pt/translation.json';
import es from '../locales/es/translation.json';
import am from '../locales/am/translation.json';
import ha from '../locales/ha/translation.json';
import ig from '../locales/ig/translation.json';
import om from '../locales/om/translation.json';
import yo from '../locales/yo/translation.json';
import ff from '../locales/ff/translation.json';

// Language configurations - ALL 12 AFRICAN LANGUAGES
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', rtl: false },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', rtl: false },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', rtl: false },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', rtl: false },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', rtl: false },
  { code: 'ff', name: 'Fula', nativeName: 'Pulaar', rtl: false },
];

const LANGUAGE_STORAGE_KEY = '@sabalist:language';

// Resources - ALL 12 AFRICAN LANGUAGES
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
  sw: { translation: sw },
  pt: { translation: pt },
  es: { translation: es },
  am: { translation: am },
  ha: { translation: ha },
  ig: { translation: ig },
  om: { translation: om },
  yo: { translation: yo },
  ff: { translation: ff },
};

// Get stored language or device language
const getInitialLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage) {
      return storedLanguage;
    }

    // Get device locale - use getLocales() for newer expo-localization
    const locales = Localization.getLocales?.() || [{ languageCode: 'en' }];
    const deviceLocale = locales[0]?.languageCode || 'en';
    const supportedLanguage = LANGUAGES.find(lang => lang.code === deviceLocale);
    return supportedLanguage ? deviceLocale : 'en';
  } catch (error) {
    console.warn('Error getting initial language:', error);
    return 'en';
  }
};

// Initialize i18n immediately (synchronous)
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Start with English
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language after init
const loadSavedLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && storedLanguage !== i18n.language) {
      await i18n.changeLanguage(storedLanguage);
      console.log('Loaded saved language:', storedLanguage);
    }
  } catch (error) {
    console.warn('Error loading saved language:', error);
  }
};

// Load saved language
loadSavedLanguage();

// Change language function with RTL support
export const changeLanguage = async (languageCode) => {
  try {
    console.log('Changing language to:', languageCode);
    
    // Change i18n language
    await i18n.changeLanguage(languageCode);
    
    // Save to storage
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    
    // Handle RTL for Arabic
    const selectedLang = LANGUAGES.find(lang => lang.code === languageCode);
    if (selectedLang?.rtl) {
      console.log('RTL language selected - Arabic layout active');
      // Note: Full RTL requires I18nManager.forceRTL(true) and app restart
      // For web, we can set document direction
      if (typeof document !== 'undefined') {
        document.dir = 'rtl';
      }
    } else {
      console.log('LTR language selected');
      if (typeof document !== 'undefined') {
        document.dir = 'ltr';
      }
    }
    
    console.log('Language successfully changed to:', languageCode);
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
};

// Check if current language is RTL
export const isRTL = () => {
  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language);
  return currentLang?.rtl || false;
};

export default i18n;
