module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable reanimated plugin for web builds
          reanimated: process.env.EXPO_PLATFORM !== 'web',
        },
      ],
    ],
    plugins: [],
  };
};


