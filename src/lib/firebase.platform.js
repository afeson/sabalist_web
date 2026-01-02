/**
 * Platform-aware Firebase configuration
 * Automatically loads the correct Firebase SDK based on platform
 */

import { Platform } from 'react-native';

// For web platform, use Firebase Web SDK
if (Platform.OS === 'web') {
  const { auth, firestore, storage } = require('./firebase.web');
  module.exports = { auth, firestore, storage };
} else {
  // For native platforms (iOS, Android), use React Native Firebase
  const { auth, firestore, storage } = require('./firebase');
  module.exports = { auth, firestore, storage };
}
