/**
 * Location Service
 * Automatic location detection for web, mobile, and tablet
 * Detects country and city using geolocation + reverse geocoding
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Get user's current location (country, city)
 * Works on: web, mobile, tablet
 * Returns: { country: string, city: string, fullAddress: string }
 */
export async function detectUserLocation() {
  console.log('📍 Starting location detection...');

  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.warn('⚠️ Location permission denied');
      return {
        country: '',
        city: '',
        fullAddress: '',
        error: 'Permission denied'
      };
    }

    console.log('✅ Location permission granted');

    // Get coordinates with timeout
    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location timeout')), 15000)
      )
    ]);

    const { latitude, longitude } = location.coords;
    console.log('📍 Coordinates:', latitude, longitude);

    // Reverse geocode to get address
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const country = address.country || '';
      const city = address.city || address.subregion || address.region || '';
      const fullAddress = formatAddress(address);

      console.log('✅ Location detected:', { country, city });

      return {
        country,
        city,
        fullAddress,
        latitude,
        longitude,
      };
    }

    throw new Error('No address found');

  } catch (error) {
    console.error('❌ Location detection failed:', error.message);
    return {
      country: '',
      city: '',
      fullAddress: '',
      error: error.message
    };
  }
}

/**
 * Format address object into readable string
 */
function formatAddress(address) {
  const parts = [
    address.city || address.subregion,
    address.region,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Check if location services are available
 */
export async function isLocationAvailable() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}
