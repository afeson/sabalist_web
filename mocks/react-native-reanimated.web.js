// Mock for react-native-reanimated on web
// Reanimated animations don't work on web, provide stubs
module.exports = {
  default: {
    View: require('react-native-web').View,
    Text: require('react-native-web').Text,
    ScrollView: require('react-native-web').ScrollView,
    createAnimatedComponent: (component) => component,
  },
  View: require('react-native-web').View,
  Text: require('react-native-web').Text,
  ScrollView: require('react-native-web').ScrollView,
  createAnimatedComponent: (component) => component,
  useSharedValue: (value) => ({ value }),
  useAnimatedStyle: (cb) => cb(),
  withTiming: (value) => value,
  withSpring: (value) => value,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    quad: (t) => t * t,
    cubic: (t) => t * t * t,
  },
};
