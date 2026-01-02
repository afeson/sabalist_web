module.exports = function(api) {
  api.cache(true);

  // Detect if we're building for web by checking if webpack is in the call stack
  const isWeb = process.env.WEBPACK === 'true' ||
                process.argv.some(arg => arg.includes('export:web'));

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable reanimated plugin for web builds to avoid worklets dependency
          reanimated: !isWeb,
        },
      ],
    ],
    plugins: [],
  };
};


