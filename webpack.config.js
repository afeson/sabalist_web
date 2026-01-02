const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons']
      }
    },
    argv
  );

  // Exclude native-only modules from web bundle with mock implementations
  config.resolve.alias = {
    ...config.resolve.alias,
    '@react-native-google-signin/google-signin': require.resolve('./mocks/google-signin.web.js'),
    '@react-native-firebase/app': require.resolve('./mocks/firebase-app.web.js'),
    '@react-native-firebase/auth': require.resolve('./mocks/firebase-auth.web.js'),
    '@react-native-firebase/firestore': require.resolve('./mocks/firebase-firestore.web.js'),
    '@react-native-firebase/storage': require.resolve('./mocks/firebase-storage.web.js'),
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

  return config;
};


