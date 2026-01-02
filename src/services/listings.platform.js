/**
 * Platform-aware listings service
 * Automatically loads the correct implementation based on platform
 */

import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Use Web SDK implementation
  module.exports = require('./listings.web');
} else {
  // Use React Native Firebase implementation
  module.exports = require('./listings');
}
