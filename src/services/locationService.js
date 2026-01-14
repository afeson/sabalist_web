/**
 * Location Service - Facebook Marketplace Style
 * User selects their city/state, stored in Firestore
 */

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import * as Location from 'expo-location';

/**
 * Get user's saved location from Firestore
 */
export async function getUserLocation(userId) {
  if (!userId) return null;

  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId, 'settings', 'location');
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Save user's selected location to Firestore
 */
export async function saveUserLocation(userId, locationData) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId, 'settings', 'location');

    await setDoc(userRef, {
      city: locationData.city,
      state: locationData.state,
      country: locationData.country,
      latitude: locationData.latitude || null,
      longitude: locationData.longitude || null,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error saving user location:', error);
    throw error;
  }
}

/**
 * Suggest location using browser geolocation (optional)
 * Returns null if permission denied or error
 */
export async function suggestLocationFromGPS() {
  try {
    console.log('📍 Starting location detection...');

    // Request permission (non-blocking)
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('❌ Location permission denied - user will select manually');
      return null;
    }

    console.log('✅ Location permission granted');

    // Get current position
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 5000,
    });

    console.log('📍 Coordinates:', position.coords.latitude, position.coords.longitude);

    // Try reverse geocoding
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      console.log('📍 Reverse geocode result:', addresses);

      if (addresses && addresses.length > 0) {
        const address = addresses[0];

        // Check if we got valid data
        if (address.city || address.region || address.country) {
          console.log('✅ Location detected:', address.city, address.region, address.country);
          return {
            city: address.city || address.subregion || 'Unknown City',
            state: address.region || address.isoCountryCode || 'Unknown State',
            country: address.country || 'Unknown Country',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      }
    } catch (geocodeError) {
      console.log('❌ Reverse geocoding failed:', geocodeError.message);
    }

    // If reverse geocoding fails, return null (user will select manually)
    console.log('❌ Location detection failed: No address found');
    return null;
  } catch (error) {
    console.log('❌ Could not detect location:', error.message);
    return null;
  }
}

/**
 * Popular cities list for manual selection
 */
export const POPULAR_CITIES = {
  'Nigeria': [
    { city: 'Lagos', state: 'Lagos' },
    { city: 'Abuja', state: 'FCT' },
    { city: 'Kano', state: 'Kano' },
    { city: 'Ibadan', state: 'Oyo' },
    { city: 'Port Harcourt', state: 'Rivers' },
    { city: 'Benin City', state: 'Edo' },
    { city: 'Kaduna', state: 'Kaduna' },
    { city: 'Enugu', state: 'Enugu' },
  ],
  'Kenya': [
    { city: 'Nairobi', state: 'Nairobi' },
    { city: 'Mombasa', state: 'Mombasa' },
    { city: 'Kisumu', state: 'Kisumu' },
    { city: 'Nakuru', state: 'Nakuru' },
  ],
  'Ghana': [
    { city: 'Accra', state: 'Greater Accra' },
    { city: 'Kumasi', state: 'Ashanti' },
    { city: 'Tamale', state: 'Northern' },
  ],
  'South Africa': [
    { city: 'Johannesburg', state: 'Gauteng' },
    { city: 'Cape Town', state: 'Western Cape' },
    { city: 'Durban', state: 'KwaZulu-Natal' },
    { city: 'Pretoria', state: 'Gauteng' },
  ],
};

/**
 * Get all countries
 */
export function getCountries() {
  return Object.keys(POPULAR_CITIES);
}

/**
 * Get cities for a country
 */
export function getCitiesForCountry(country) {
  return POPULAR_CITIES[country] || [];
}
