module.exports = function(api) {
  // Cache based on the WEBPACK env var so web vs native get different configs
  const isWeb = process.env.WEBPACK === 'true' ||
                process.argv.some(arg => arg.includes('export:web'));
  api.cache.using(() => isWeb ? 'web' : 'native');

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable reanimated plugin for native builds, disable for web
          reanimated: !isWeb,
        },
      ],
    ],
    plugins: [],
  };
};
