const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons'],
      }
    },
    argv
  );

  // Exclude mocks directory from babel processing
  config.module.rules.forEach(rule => {
    if (rule.use && rule.use.loader && rule.use.loader.includes('babel-loader')) {
      rule.exclude = rule.exclude || [];
      if (Array.isArray(rule.exclude)) {
        rule.exclude.push(/mocks/);
      } else {
        rule.exclude = [rule.exclude, /mocks/];
      }
    }
  });

  // Exclude native-only modules from web bundle with mock implementations
  config.resolve.alias = {
    ...config.resolve.alias,
    '@react-native-google-signin/google-signin': require.resolve('./mocks/google-signin.web.js'),
    '@react-native-firebase/app': require.resolve('./mocks/firebase-app.web.js'),
    '@react-native-firebase/auth': require.resolve('./mocks/firebase-auth.web.js'),
    '@react-native-firebase/firestore': require.resolve('./mocks/firebase-firestore.web.js'),
    '@react-native-firebase/storage': require.resolve('./mocks/firebase-storage.web.js'),
    // Mock animation libraries that don't work on web
    'react-native-reanimated': require.resolve('./mocks/react-native-reanimated.web.js'),
    '@gorhom/bottom-sheet': require.resolve('./mocks/gorhom-bottom-sheet.web.js'),
    // Redirect react-native-worklets to worklets-core
    'react-native-worklets': 'react-native-worklets-core',
  };

  // Add polyfill fallbacks for Node.js modules not available in browser
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    path: require.resolve('path-browserify'),
    fs: false,
    os: false,
  };

  // Ensure proper dev server configuration
  if (config.devServer) {
    config.devServer.historyApiFallback = true;
  }

  // Inject environment variables into the build
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
      'process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
      'process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
      'process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
      'process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.EXPO_PUBLIC_FIREBASE_APP_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
      'process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID),
    })
  );

  return config;
};


