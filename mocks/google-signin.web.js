// Mock for @react-native-google-signin/google-signin on web
// This module is native-only and not used on web
module.exports = {
  GoogleSignin: {
    configure: () => {},
    hasPlayServices: () => Promise.resolve(false),
    signIn: () => Promise.reject(new Error('Google Sign-In not available on web')),
    signOut: () => Promise.resolve(),
    isSignedIn: () => Promise.resolve(false),
    getCurrentUser: () => Promise.resolve(null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: '12501',
    IN_PROGRESS: '12502',
    PLAY_SERVICES_NOT_AVAILABLE: '12503',
  },
};
