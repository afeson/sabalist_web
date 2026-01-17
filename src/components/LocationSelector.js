import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS } from '../theme/premiumTheme';
import {
  suggestLocationFromGPS,
  getCountries,
  getCitiesForCountry,
  saveUserLocation,
} from '../services/locationService';

export default function LocationSelector({ visible, onClose, onLocationSelected, userId }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suggestedLocation, setSuggestedLocation] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const countries = getCountries();

  // Helper to get translated country name
  const getTranslatedCountryName = (countryKey) => {
    const translated = t(`countries.${countryKey}`, { defaultValue: countryKey });
    return translated;
  };

  // Try to suggest location on mount (only once)
  useEffect(() => {
    if (visible && !suggestedLocation && !loading) {
      detectLocation();
    }
  }, [visible]);

  const detectLocation = async () => {
    setLoading(true);
    try {
      const location = await suggestLocationFromGPS();
      if (location) {
        setSuggestedLocation(location);
        // Preselect country if it exists in our list
        if (location.country && countries.includes(location.country)) {
          setSelectedCountry(location.country);
        }
      }
    } catch (error) {
      console.log('Location detection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggested = async () => {
    if (!suggestedLocation) return;

    setLoading(true);
    try {
      // saveUserLocation now works with or without userId
      await saveUserLocation(userId, suggestedLocation);
      onLocationSelected(suggestedLocation);
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
    }
    setLoading(false);
  };

  const handleSelectCity = async (city, state) => {
    if (!selectedCountry) return;

    setLoading(true);
    try {
      const locationData = {
        city,
        state,
        country: selectedCountry,
      };
      // saveUserLocation now works with or without userId
      await saveUserLocation(userId, locationData);
      onLocationSelected(locationData);
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
    }
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('location.selectYourLocation')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={PREMIUM_COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* GPS Suggestion */}
            {loading && !suggestedLocation && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={PREMIUM_COLORS.accent} />
                <Text style={styles.loadingText}>{t('location.detectingLocation')}</Text>
              </View>
            )}

            {suggestedLocation && (
              <View style={styles.suggestedBox}>
                <Ionicons name="location" size={24} color={PREMIUM_COLORS.accent} />
                <View style={styles.suggestedText}>
                  <Text style={styles.suggestedTitle}>{t('location.detectedLocation')}</Text>
                  <Text style={styles.suggestedCity}>
                    {suggestedLocation.city}, {suggestedLocation.state}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.useButton}
                  onPress={handleUseSuggested}
                  disabled={loading}
                >
                  <Text style={styles.useButtonText}>{t('location.use')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('location.orSelectManually')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Country Selection */}
            {!selectedCountry ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('location.selectCountry')}</Text>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country}
                    style={styles.listItem}
                    onPress={() => setSelectedCountry(country)}
                  >
                    <Text style={styles.listItemText}>{getTranslatedCountryName(country)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={PREMIUM_COLORS.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // City Selection
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedCountry(null)}
                >
                  <Ionicons name="chevron-back" size={20} color={PREMIUM_COLORS.accent} />
                  <Text style={styles.backButtonText}>{t('location.backToCountries')}</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{t('location.selectCityIn', { country: getTranslatedCountryName(selectedCountry) })}</Text>
                {getCitiesForCountry(selectedCountry).map((location) => (
                  <TouchableOpacity
                    key={`${location.city}-${location.state}`}
                    style={styles.listItem}
                    onPress={() => handleSelectCity(location.city, location.state)}
                    disabled={loading}
                  >
                    <View>
                      <Text style={styles.listItemText}>{location.city}</Text>
                      <Text style={styles.listItemSubtext}>{location.state}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: PREMIUM_COLORS.card,
    borderTopLeftRadius: PREMIUM_RADIUS.xl,
    borderTopRightRadius: PREMIUM_RADIUS.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: PREMIUM_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
  },
  closeButton: {
    padding: PREMIUM_SPACING.xs,
  },
  content: {
    padding: PREMIUM_SPACING.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.md,
    padding: PREMIUM_SPACING.lg,
  },
  loadingText: {
    fontSize: 14,
    color: PREMIUM_COLORS.muted,
  },
  suggestedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.md,
    padding: PREMIUM_SPACING.lg,
    backgroundColor: `${PREMIUM_COLORS.accent}10`,
    borderRadius: PREMIUM_RADIUS.lg,
    borderWidth: 1,
    borderColor: `${PREMIUM_COLORS.accent}30`,
  },
  suggestedText: {
    flex: 1,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PREMIUM_COLORS.muted,
    marginBottom: 2,
  },
  suggestedCity: {
    fontSize: 16,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
  },
  useButton: {
    backgroundColor: PREMIUM_COLORS.accent,
    paddingHorizontal: PREMIUM_SPACING.lg,
    paddingVertical: PREMIUM_SPACING.sm,
    borderRadius: PREMIUM_RADIUS.md,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: PREMIUM_COLORS.card,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: PREMIUM_SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PREMIUM_COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: PREMIUM_COLORS.muted,
    paddingHorizontal: PREMIUM_SPACING.md,
  },
  section: {
    marginBottom: PREMIUM_SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginBottom: PREMIUM_SPACING.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: PREMIUM_SPACING.lg,
    backgroundColor: PREMIUM_COLORS.bg,
    borderRadius: PREMIUM_RADIUS.md,
    marginBottom: PREMIUM_SPACING.sm,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
  },
  listItemSubtext: {
    fontSize: 13,
    color: PREMIUM_COLORS.muted,
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.xs,
    marginBottom: PREMIUM_SPACING.md,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.accent,
  },
});
