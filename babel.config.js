module.exports = function(api) {
  api.cache(true);

  // Conditionally add reanimated plugin only for native platforms
  const plugins = [];

  // Only add reanimated plugin for non-web platforms
  if (process.env.EXPO_PLATFORM !== 'web') {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};


