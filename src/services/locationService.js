/**
 * Location Service - Facebook Marketplace Style
 * User selects their city/state, stored in Firestore and AsyncStorage
 */

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_STORAGE_KEY = '@sabalist:userLocation';

/**
 * Get user's saved location from AsyncStorage first, then Firestore as fallback
 */
export async function getUserLocation(userId) {
  // First try AsyncStorage (faster)
  try {
    const storedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (storedLocation) {
      const parsed = JSON.parse(storedLocation);
      console.log('📍 Location loaded from AsyncStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.warn('Error reading location from AsyncStorage:', error);
  }

  // Fall back to Firestore if user is logged in
  if (!userId) return null;

  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId, 'settings', 'location');
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const location = docSnap.data();
      // Cache in AsyncStorage
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
      return location;
    }
    return null;
  } catch (error) {
    console.error('Error getting user location from Firestore:', error);
    return null;
  }
}

/**
 * Save user's selected location to Firestore and AsyncStorage
 */
export async function saveUserLocation(userId, locationData) {
  const locationToSave = {
    city: locationData.city,
    state: locationData.state,
    country: locationData.country,
    latitude: locationData.latitude || null,
    longitude: locationData.longitude || null,
    updatedAt: new Date().toISOString(),
  };

  // Always save to AsyncStorage (works without login)
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationToSave));
    console.log('📍 Location saved to AsyncStorage:', locationToSave);
  } catch (error) {
    console.warn('Error saving location to AsyncStorage:', error);
  }

  // Also save to Firestore if user is logged in
  if (userId) {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId, 'settings', 'location');
      await setDoc(userRef, locationToSave);
      console.log('📍 Location saved to Firestore');
    } catch (error) {
      console.error('Error saving user location to Firestore:', error);
      // Don't throw - AsyncStorage save was successful
    }
  }

  return true;
}

/**
 * Reverse geocode using Nominatim (OpenStreetMap) - free, no API key required
 * Used as fallback when expo-location's reverse geocoding fails (common on web)
 */
async function reverseGeocodeWithNominatim(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Sabalist/1.0 (African Marketplace App)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📍 Nominatim result:', data);

    if (data && data.address) {
      const addr = data.address;
      return {
        city: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Unknown City',
        state: addr.state || addr.province || addr.region || 'Unknown State',
        country: addr.country || 'Unknown Country',
      };
    }

    return null;
  } catch (error) {
    console.log('❌ Nominatim reverse geocoding failed:', error.message);
    return null;
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
      timeout: 10000,
    });

    const { latitude, longitude } = position.coords;
    console.log('📍 Coordinates:', latitude, longitude);

    // Try expo-location reverse geocoding first (works better on native)
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      console.log('📍 Expo reverse geocode result:', addresses);

      if (addresses && addresses.length > 0) {
        const address = addresses[0];

        // Check if we got valid data
        if (address.city || address.region || address.country) {
          console.log('✅ Location detected via Expo:', address.city, address.region, address.country);
          return {
            city: address.city || address.subregion || 'Unknown City',
            state: address.region || address.isoCountryCode || 'Unknown State',
            country: address.country || 'Unknown Country',
            latitude,
            longitude,
          };
        }
      }
    } catch (geocodeError) {
      console.log('⚠️ Expo reverse geocoding failed:', geocodeError.message);
    }

    // Fallback: Use Nominatim (OpenStreetMap) for web/when expo fails
    console.log('📍 Trying Nominatim fallback...');
    const nominatimResult = await reverseGeocodeWithNominatim(latitude, longitude);

    if (nominatimResult) {
      console.log('✅ Location detected via Nominatim:', nominatimResult);
      return {
        ...nominatimResult,
        latitude,
        longitude,
      };
    }

    // If all geocoding fails, return null (user will select manually)
    console.log('❌ Location detection failed: No address found from any source');
    return null;
  } catch (error) {
    console.log('❌ Could not detect location:', error.message);
    return null;
  }
}

/**
 * Full list of all countries with major cities
 */
export const POPULAR_CITIES = {
  // Africa
  'Algeria': [
    { city: 'Algiers', state: 'Algiers' },
    { city: 'Oran', state: 'Oran' },
    { city: 'Constantine', state: 'Constantine' },
  ],
  'Angola': [
    { city: 'Luanda', state: 'Luanda' },
    { city: 'Huambo', state: 'Huambo' },
    { city: 'Lobito', state: 'Benguela' },
  ],
  'Benin': [
    { city: 'Cotonou', state: 'Littoral' },
    { city: 'Porto-Novo', state: 'Ouémé' },
    { city: 'Parakou', state: 'Borgou' },
  ],
  'Botswana': [
    { city: 'Gaborone', state: 'South-East' },
    { city: 'Francistown', state: 'North-East' },
    { city: 'Molepolole', state: 'Kweneng' },
  ],
  'Burkina Faso': [
    { city: 'Ouagadougou', state: 'Centre' },
    { city: 'Bobo-Dioulasso', state: 'Hauts-Bassins' },
    { city: 'Koudougou', state: 'Centre-Ouest' },
  ],
  'Burundi': [
    { city: 'Bujumbura', state: 'Bujumbura Mairie' },
    { city: 'Gitega', state: 'Gitega' },
    { city: 'Muyinga', state: 'Muyinga' },
  ],
  'Cameroon': [
    { city: 'Douala', state: 'Littoral' },
    { city: 'Yaoundé', state: 'Centre' },
    { city: 'Bamenda', state: 'North-West' },
    { city: 'Bafoussam', state: 'West' },
  ],
  'Cape Verde': [
    { city: 'Praia', state: 'Santiago' },
    { city: 'Mindelo', state: 'São Vicente' },
  ],
  'Central African Republic': [
    { city: 'Bangui', state: 'Bangui' },
    { city: 'Bimbo', state: 'Ombella-M\'Poko' },
  ],
  'Chad': [
    { city: 'N\'Djamena', state: 'N\'Djamena' },
    { city: 'Moundou', state: 'Logone Occidental' },
    { city: 'Abéché', state: 'Ouaddaï' },
  ],
  'Comoros': [
    { city: 'Moroni', state: 'Grande Comore' },
    { city: 'Mutsamudu', state: 'Anjouan' },
  ],
  'Democratic Republic of the Congo': [
    { city: 'Kinshasa', state: 'Kinshasa' },
    { city: 'Lubumbashi', state: 'Haut-Katanga' },
    { city: 'Mbuji-Mayi', state: 'Kasaï-Oriental' },
    { city: 'Goma', state: 'North Kivu' },
  ],
  'Republic of the Congo': [
    { city: 'Brazzaville', state: 'Brazzaville' },
    { city: 'Pointe-Noire', state: 'Pointe-Noire' },
  ],
  'Côte d\'Ivoire': [
    { city: 'Abidjan', state: 'Lagunes' },
    { city: 'Yamoussoukro', state: 'Lacs' },
    { city: 'Bouaké', state: 'Vallée du Bandama' },
  ],
  'Djibouti': [
    { city: 'Djibouti', state: 'Djibouti' },
    { city: 'Ali Sabieh', state: 'Ali Sabieh' },
  ],
  'Egypt': [
    { city: 'Cairo', state: 'Cairo' },
    { city: 'Alexandria', state: 'Alexandria' },
    { city: 'Giza', state: 'Giza' },
    { city: 'Luxor', state: 'Luxor' },
  ],
  'Equatorial Guinea': [
    { city: 'Malabo', state: 'Bioko Norte' },
    { city: 'Bata', state: 'Litoral' },
  ],
  'Eritrea': [
    { city: 'Asmara', state: 'Maekel' },
    { city: 'Keren', state: 'Anseba' },
  ],
  'Eswatini': [
    { city: 'Mbabane', state: 'Hhohho' },
    { city: 'Manzini', state: 'Manzini' },
  ],
  'Ethiopia': [
    { city: 'Addis Ababa', state: 'Addis Ababa' },
    { city: 'Dire Dawa', state: 'Dire Dawa' },
    { city: 'Mekelle', state: 'Tigray' },
    { city: 'Gondar', state: 'Amhara' },
  ],
  'Gabon': [
    { city: 'Libreville', state: 'Estuaire' },
    { city: 'Port-Gentil', state: 'Ogooué-Maritime' },
  ],
  'Gambia': [
    { city: 'Banjul', state: 'Banjul' },
    { city: 'Serekunda', state: 'Kanifing' },
  ],
  'Ghana': [
    { city: 'Accra', state: 'Greater Accra' },
    { city: 'Kumasi', state: 'Ashanti' },
    { city: 'Tamale', state: 'Northern' },
    { city: 'Takoradi', state: 'Western' },
  ],
  'Guinea': [
    { city: 'Conakry', state: 'Conakry' },
    { city: 'Nzérékoré', state: 'Nzérékoré' },
    { city: 'Kankan', state: 'Kankan' },
  ],
  'Guinea-Bissau': [
    { city: 'Bissau', state: 'Bissau' },
    { city: 'Bafatá', state: 'Bafatá' },
  ],
  'Kenya': [
    { city: 'Nairobi', state: 'Nairobi' },
    { city: 'Mombasa', state: 'Mombasa' },
    { city: 'Kisumu', state: 'Kisumu' },
    { city: 'Nakuru', state: 'Nakuru' },
    { city: 'Eldoret', state: 'Uasin Gishu' },
  ],
  'Lesotho': [
    { city: 'Maseru', state: 'Maseru' },
    { city: 'Teyateyaneng', state: 'Berea' },
  ],
  'Liberia': [
    { city: 'Monrovia', state: 'Montserrado' },
    { city: 'Gbarnga', state: 'Bong' },
  ],
  'Libya': [
    { city: 'Tripoli', state: 'Tripoli' },
    { city: 'Benghazi', state: 'Benghazi' },
    { city: 'Misrata', state: 'Misrata' },
  ],
  'Madagascar': [
    { city: 'Antananarivo', state: 'Analamanga' },
    { city: 'Toamasina', state: 'Atsinanana' },
    { city: 'Antsirabe', state: 'Vakinankaratra' },
  ],
  'Malawi': [
    { city: 'Lilongwe', state: 'Central' },
    { city: 'Blantyre', state: 'Southern' },
    { city: 'Mzuzu', state: 'Northern' },
  ],
  'Mali': [
    { city: 'Bamako', state: 'Bamako' },
    { city: 'Sikasso', state: 'Sikasso' },
    { city: 'Ségou', state: 'Ségou' },
  ],
  'Mauritania': [
    { city: 'Nouakchott', state: 'Nouakchott' },
    { city: 'Nouadhibou', state: 'Dakhlet Nouadhibou' },
  ],
  'Mauritius': [
    { city: 'Port Louis', state: 'Port Louis' },
    { city: 'Beau Bassin-Rose Hill', state: 'Plaines Wilhems' },
  ],
  'Morocco': [
    { city: 'Casablanca', state: 'Casablanca-Settat' },
    { city: 'Rabat', state: 'Rabat-Salé-Kénitra' },
    { city: 'Marrakech', state: 'Marrakech-Safi' },
    { city: 'Fes', state: 'Fès-Meknès' },
  ],
  'Mozambique': [
    { city: 'Maputo', state: 'Maputo' },
    { city: 'Beira', state: 'Sofala' },
    { city: 'Nampula', state: 'Nampula' },
  ],
  'Namibia': [
    { city: 'Windhoek', state: 'Khomas' },
    { city: 'Walvis Bay', state: 'Erongo' },
    { city: 'Swakopmund', state: 'Erongo' },
  ],
  'Niger': [
    { city: 'Niamey', state: 'Niamey' },
    { city: 'Zinder', state: 'Zinder' },
    { city: 'Maradi', state: 'Maradi' },
  ],
  'Nigeria': [
    { city: 'Lagos', state: 'Lagos' },
    { city: 'Abuja', state: 'FCT' },
    { city: 'Kano', state: 'Kano' },
    { city: 'Ibadan', state: 'Oyo' },
    { city: 'Port Harcourt', state: 'Rivers' },
    { city: 'Benin City', state: 'Edo' },
    { city: 'Kaduna', state: 'Kaduna' },
    { city: 'Enugu', state: 'Enugu' },
    { city: 'Aba', state: 'Abia' },
    { city: 'Warri', state: 'Delta' },
  ],
  'Rwanda': [
    { city: 'Kigali', state: 'Kigali' },
    { city: 'Butare', state: 'Southern' },
    { city: 'Gisenyi', state: 'Western' },
  ],
  'São Tomé and Príncipe': [
    { city: 'São Tomé', state: 'Água Grande' },
  ],
  'Senegal': [
    { city: 'Dakar', state: 'Dakar' },
    { city: 'Touba', state: 'Diourbel' },
    { city: 'Thiès', state: 'Thiès' },
  ],
  'Seychelles': [
    { city: 'Victoria', state: 'Mahé' },
  ],
  'Sierra Leone': [
    { city: 'Freetown', state: 'Western Area' },
    { city: 'Bo', state: 'Southern' },
    { city: 'Kenema', state: 'Eastern' },
  ],
  'Somalia': [
    { city: 'Mogadishu', state: 'Banaadir' },
    { city: 'Hargeisa', state: 'Woqooyi Galbeed' },
    { city: 'Kismayo', state: 'Lower Juba' },
  ],
  'South Africa': [
    { city: 'Johannesburg', state: 'Gauteng' },
    { city: 'Cape Town', state: 'Western Cape' },
    { city: 'Durban', state: 'KwaZulu-Natal' },
    { city: 'Pretoria', state: 'Gauteng' },
    { city: 'Port Elizabeth', state: 'Eastern Cape' },
    { city: 'Bloemfontein', state: 'Free State' },
  ],
  'South Sudan': [
    { city: 'Juba', state: 'Central Equatoria' },
    { city: 'Wau', state: 'Western Bahr el Ghazal' },
  ],
  'Sudan': [
    { city: 'Khartoum', state: 'Khartoum' },
    { city: 'Omdurman', state: 'Khartoum' },
    { city: 'Port Sudan', state: 'Red Sea' },
  ],
  'Tanzania': [
    { city: 'Dar es Salaam', state: 'Dar es Salaam' },
    { city: 'Dodoma', state: 'Dodoma' },
    { city: 'Mwanza', state: 'Mwanza' },
    { city: 'Arusha', state: 'Arusha' },
  ],
  'Togo': [
    { city: 'Lomé', state: 'Maritime' },
    { city: 'Sokodé', state: 'Centrale' },
    { city: 'Kara', state: 'Kara' },
  ],
  'Tunisia': [
    { city: 'Tunis', state: 'Tunis' },
    { city: 'Sfax', state: 'Sfax' },
    { city: 'Sousse', state: 'Sousse' },
  ],
  'Uganda': [
    { city: 'Kampala', state: 'Central' },
    { city: 'Gulu', state: 'Northern' },
    { city: 'Lira', state: 'Northern' },
    { city: 'Mbarara', state: 'Western' },
  ],
  'Zambia': [
    { city: 'Lusaka', state: 'Lusaka' },
    { city: 'Kitwe', state: 'Copperbelt' },
    { city: 'Ndola', state: 'Copperbelt' },
  ],
  'Zimbabwe': [
    { city: 'Harare', state: 'Harare' },
    { city: 'Bulawayo', state: 'Bulawayo' },
    { city: 'Chitungwiza', state: 'Harare' },
  ],

  // Europe
  'United Kingdom': [
    { city: 'London', state: 'England' },
    { city: 'Manchester', state: 'England' },
    { city: 'Birmingham', state: 'England' },
    { city: 'Edinburgh', state: 'Scotland' },
    { city: 'Glasgow', state: 'Scotland' },
  ],
  'France': [
    { city: 'Paris', state: 'Île-de-France' },
    { city: 'Marseille', state: 'Provence-Alpes-Côte d\'Azur' },
    { city: 'Lyon', state: 'Auvergne-Rhône-Alpes' },
    { city: 'Toulouse', state: 'Occitanie' },
  ],
  'Germany': [
    { city: 'Berlin', state: 'Berlin' },
    { city: 'Munich', state: 'Bavaria' },
    { city: 'Frankfurt', state: 'Hesse' },
    { city: 'Hamburg', state: 'Hamburg' },
  ],
  'Italy': [
    { city: 'Rome', state: 'Lazio' },
    { city: 'Milan', state: 'Lombardy' },
    { city: 'Naples', state: 'Campania' },
    { city: 'Turin', state: 'Piedmont' },
  ],
  'Spain': [
    { city: 'Madrid', state: 'Community of Madrid' },
    { city: 'Barcelona', state: 'Catalonia' },
    { city: 'Valencia', state: 'Valencian Community' },
    { city: 'Seville', state: 'Andalusia' },
  ],
  'Portugal': [
    { city: 'Lisbon', state: 'Lisbon' },
    { city: 'Porto', state: 'Porto' },
    { city: 'Braga', state: 'Braga' },
  ],
  'Netherlands': [
    { city: 'Amsterdam', state: 'North Holland' },
    { city: 'Rotterdam', state: 'South Holland' },
    { city: 'The Hague', state: 'South Holland' },
  ],
  'Belgium': [
    { city: 'Brussels', state: 'Brussels' },
    { city: 'Antwerp', state: 'Antwerp' },
    { city: 'Ghent', state: 'East Flanders' },
  ],
  'Switzerland': [
    { city: 'Zurich', state: 'Zurich' },
    { city: 'Geneva', state: 'Geneva' },
    { city: 'Basel', state: 'Basel-Stadt' },
  ],
  'Austria': [
    { city: 'Vienna', state: 'Vienna' },
    { city: 'Graz', state: 'Styria' },
    { city: 'Salzburg', state: 'Salzburg' },
  ],
  'Sweden': [
    { city: 'Stockholm', state: 'Stockholm' },
    { city: 'Gothenburg', state: 'Västra Götaland' },
    { city: 'Malmö', state: 'Skåne' },
  ],
  'Norway': [
    { city: 'Oslo', state: 'Oslo' },
    { city: 'Bergen', state: 'Vestland' },
    { city: 'Trondheim', state: 'Trøndelag' },
  ],
  'Denmark': [
    { city: 'Copenhagen', state: 'Capital Region' },
    { city: 'Aarhus', state: 'Central Denmark' },
    { city: 'Odense', state: 'Southern Denmark' },
  ],
  'Finland': [
    { city: 'Helsinki', state: 'Uusimaa' },
    { city: 'Espoo', state: 'Uusimaa' },
    { city: 'Tampere', state: 'Pirkanmaa' },
  ],
  'Ireland': [
    { city: 'Dublin', state: 'Leinster' },
    { city: 'Cork', state: 'Munster' },
    { city: 'Galway', state: 'Connacht' },
  ],
  'Poland': [
    { city: 'Warsaw', state: 'Masovian' },
    { city: 'Krakow', state: 'Lesser Poland' },
    { city: 'Gdansk', state: 'Pomeranian' },
  ],
  'Czech Republic': [
    { city: 'Prague', state: 'Prague' },
    { city: 'Brno', state: 'South Moravian' },
    { city: 'Ostrava', state: 'Moravian-Silesian' },
  ],
  'Greece': [
    { city: 'Athens', state: 'Attica' },
    { city: 'Thessaloniki', state: 'Central Macedonia' },
    { city: 'Patras', state: 'Western Greece' },
  ],
  'Russia': [
    { city: 'Moscow', state: 'Moscow' },
    { city: 'Saint Petersburg', state: 'Saint Petersburg' },
    { city: 'Novosibirsk', state: 'Novosibirsk Oblast' },
  ],
  'Ukraine': [
    { city: 'Kyiv', state: 'Kyiv' },
    { city: 'Kharkiv', state: 'Kharkiv Oblast' },
    { city: 'Odesa', state: 'Odesa Oblast' },
  ],

  // North America
  'United States': [
    { city: 'New York', state: 'New York' },
    { city: 'Los Angeles', state: 'California' },
    { city: 'Chicago', state: 'Illinois' },
    { city: 'Houston', state: 'Texas' },
    { city: 'Miami', state: 'Florida' },
    { city: 'Atlanta', state: 'Georgia' },
    { city: 'San Francisco', state: 'California' },
    { city: 'Seattle', state: 'Washington' },
    { city: 'Boston', state: 'Massachusetts' },
    { city: 'Dallas', state: 'Texas' },
  ],
  'Canada': [
    { city: 'Toronto', state: 'Ontario' },
    { city: 'Vancouver', state: 'British Columbia' },
    { city: 'Montreal', state: 'Quebec' },
    { city: 'Calgary', state: 'Alberta' },
    { city: 'Ottawa', state: 'Ontario' },
    { city: 'Edmonton', state: 'Alberta' },
  ],
  'Mexico': [
    { city: 'Mexico City', state: 'CDMX' },
    { city: 'Guadalajara', state: 'Jalisco' },
    { city: 'Monterrey', state: 'Nuevo León' },
    { city: 'Cancún', state: 'Quintana Roo' },
  ],

  // Central America & Caribbean
  'Jamaica': [
    { city: 'Kingston', state: 'Surrey' },
    { city: 'Montego Bay', state: 'Cornwall' },
  ],
  'Trinidad and Tobago': [
    { city: 'Port of Spain', state: 'Port of Spain' },
    { city: 'San Fernando', state: 'San Fernando' },
  ],
  'Bahamas': [
    { city: 'Nassau', state: 'New Providence' },
    { city: 'Freeport', state: 'Grand Bahama' },
  ],

  // South America
  'Brazil': [
    { city: 'São Paulo', state: 'São Paulo' },
    { city: 'Rio de Janeiro', state: 'Rio de Janeiro' },
    { city: 'Brasília', state: 'Federal District' },
    { city: 'Salvador', state: 'Bahia' },
    { city: 'Fortaleza', state: 'Ceará' },
  ],
  'Argentina': [
    { city: 'Buenos Aires', state: 'Buenos Aires' },
    { city: 'Córdoba', state: 'Córdoba' },
    { city: 'Rosario', state: 'Santa Fe' },
    { city: 'Mendoza', state: 'Mendoza' },
  ],
  'Colombia': [
    { city: 'Bogotá', state: 'Cundinamarca' },
    { city: 'Medellín', state: 'Antioquia' },
    { city: 'Cali', state: 'Valle del Cauca' },
    { city: 'Barranquilla', state: 'Atlántico' },
  ],
  'Peru': [
    { city: 'Lima', state: 'Lima' },
    { city: 'Arequipa', state: 'Arequipa' },
    { city: 'Cusco', state: 'Cusco' },
  ],
  'Chile': [
    { city: 'Santiago', state: 'Santiago Metropolitan' },
    { city: 'Valparaíso', state: 'Valparaíso' },
    { city: 'Concepción', state: 'Biobío' },
  ],
  'Venezuela': [
    { city: 'Caracas', state: 'Capital District' },
    { city: 'Maracaibo', state: 'Zulia' },
    { city: 'Valencia', state: 'Carabobo' },
  ],

  // Asia
  'China': [
    { city: 'Beijing', state: 'Beijing' },
    { city: 'Shanghai', state: 'Shanghai' },
    { city: 'Guangzhou', state: 'Guangdong' },
    { city: 'Shenzhen', state: 'Guangdong' },
    { city: 'Chengdu', state: 'Sichuan' },
  ],
  'India': [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'Delhi' },
    { city: 'Bangalore', state: 'Karnataka' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Hyderabad', state: 'Telangana' },
  ],
  'Japan': [
    { city: 'Tokyo', state: 'Tokyo' },
    { city: 'Osaka', state: 'Osaka' },
    { city: 'Kyoto', state: 'Kyoto' },
    { city: 'Yokohama', state: 'Kanagawa' },
  ],
  'South Korea': [
    { city: 'Seoul', state: 'Seoul' },
    { city: 'Busan', state: 'Busan' },
    { city: 'Incheon', state: 'Incheon' },
    { city: 'Daegu', state: 'Daegu' },
  ],
  'Indonesia': [
    { city: 'Jakarta', state: 'DKI Jakarta' },
    { city: 'Surabaya', state: 'East Java' },
    { city: 'Bandung', state: 'West Java' },
    { city: 'Bali', state: 'Bali' },
  ],
  'Philippines': [
    { city: 'Manila', state: 'Metro Manila' },
    { city: 'Cebu City', state: 'Cebu' },
    { city: 'Davao City', state: 'Davao del Sur' },
  ],
  'Thailand': [
    { city: 'Bangkok', state: 'Bangkok' },
    { city: 'Chiang Mai', state: 'Chiang Mai' },
    { city: 'Phuket', state: 'Phuket' },
  ],
  'Vietnam': [
    { city: 'Ho Chi Minh City', state: 'Ho Chi Minh City' },
    { city: 'Hanoi', state: 'Hanoi' },
    { city: 'Da Nang', state: 'Da Nang' },
  ],
  'Malaysia': [
    { city: 'Kuala Lumpur', state: 'Kuala Lumpur' },
    { city: 'George Town', state: 'Penang' },
    { city: 'Johor Bahru', state: 'Johor' },
  ],
  'Singapore': [
    { city: 'Singapore', state: 'Singapore' },
  ],
  'Pakistan': [
    { city: 'Karachi', state: 'Sindh' },
    { city: 'Lahore', state: 'Punjab' },
    { city: 'Islamabad', state: 'Islamabad' },
  ],
  'Bangladesh': [
    { city: 'Dhaka', state: 'Dhaka' },
    { city: 'Chittagong', state: 'Chittagong' },
    { city: 'Khulna', state: 'Khulna' },
  ],
  'United Arab Emirates': [
    { city: 'Dubai', state: 'Dubai' },
    { city: 'Abu Dhabi', state: 'Abu Dhabi' },
    { city: 'Sharjah', state: 'Sharjah' },
  ],
  'Saudi Arabia': [
    { city: 'Riyadh', state: 'Riyadh' },
    { city: 'Jeddah', state: 'Makkah' },
    { city: 'Dammam', state: 'Eastern' },
    { city: 'Mecca', state: 'Makkah' },
  ],
  'Qatar': [
    { city: 'Doha', state: 'Doha' },
    { city: 'Al Wakrah', state: 'Al Wakrah' },
  ],
  'Kuwait': [
    { city: 'Kuwait City', state: 'Al Asimah' },
    { city: 'Hawalli', state: 'Hawalli' },
  ],
  'Bahrain': [
    { city: 'Manama', state: 'Capital' },
    { city: 'Riffa', state: 'Southern' },
  ],
  'Oman': [
    { city: 'Muscat', state: 'Muscat' },
    { city: 'Salalah', state: 'Dhofar' },
  ],
  'Israel': [
    { city: 'Tel Aviv', state: 'Tel Aviv' },
    { city: 'Jerusalem', state: 'Jerusalem' },
    { city: 'Haifa', state: 'Haifa' },
  ],
  'Turkey': [
    { city: 'Istanbul', state: 'Istanbul' },
    { city: 'Ankara', state: 'Ankara' },
    { city: 'Izmir', state: 'Izmir' },
    { city: 'Antalya', state: 'Antalya' },
  ],
  'Iran': [
    { city: 'Tehran', state: 'Tehran' },
    { city: 'Mashhad', state: 'Razavi Khorasan' },
    { city: 'Isfahan', state: 'Isfahan' },
  ],
  'Iraq': [
    { city: 'Baghdad', state: 'Baghdad' },
    { city: 'Basra', state: 'Basra' },
    { city: 'Erbil', state: 'Erbil' },
  ],

  // Oceania
  'Australia': [
    { city: 'Sydney', state: 'New South Wales' },
    { city: 'Melbourne', state: 'Victoria' },
    { city: 'Brisbane', state: 'Queensland' },
    { city: 'Perth', state: 'Western Australia' },
    { city: 'Adelaide', state: 'South Australia' },
  ],
  'New Zealand': [
    { city: 'Auckland', state: 'Auckland' },
    { city: 'Wellington', state: 'Wellington' },
    { city: 'Christchurch', state: 'Canterbury' },
  ],
  'Fiji': [
    { city: 'Suva', state: 'Central' },
    { city: 'Nadi', state: 'Western' },
  ],
  'Papua New Guinea': [
    { city: 'Port Moresby', state: 'National Capital' },
    { city: 'Lae', state: 'Morobe' },
  ],
};

/**
 * Get all countries (sorted alphabetically)
 */
export function getCountries() {
  return Object.keys(POPULAR_CITIES).sort();
}

/**
 * Get cities for a country
 */
export function getCitiesForCountry(country) {
  return POPULAR_CITIES[country] || [];
}

/**
 * Detect user location (alias for suggestLocationFromGPS with error handling)
 */
export async function detectUserLocation() {
  try {
    const location = await suggestLocationFromGPS();
    if (location) {
      return { success: true, ...location };
    }
    return { success: false, error: 'Could not detect location' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
