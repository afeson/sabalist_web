module.exports = ({ config }) => {
  // Base plugins that work on all platforms
  const basePlugins = [];

  // Native-only plugins (exclude from web)
  const nativePlugins = [
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
  ];

  // Determine which plugins to include based on platform
  const plugins = process.env.EXPO_PLATFORM === 'web'
    ? basePlugins
    : [...basePlugins, ...nativePlugins];

  return {
    ...config,
    expo: {
      name: 'Sabalist',
      slug: 'sabalist',
      owner: 'afrson',
      version: '1.1.0',
      orientation: 'portrait',
      icon: './assets/branding/sabalist-icon-safe.png',
      userInterfaceStyle: 'light',
      scheme: 'sabalist',
      splash: {
        image: './assets/branding/sabalist-logo-full.png',
        resizeMode: 'contain',
        backgroundColor: '#E50914',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.sabalist.app',
        icon: './assets/branding/sabalist-icon-safe.png',
        googleServicesFile: './ios/GoogleService-Info.plist',
        associatedDomains: [
          'applinks:sabalist.page.link',
          'applinks:sabalist.page.link',
        ],
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
        },
      },
      android: {
        package: 'com.sabalist.app',
        icon: './assets/branding/sabalist-icon-safe.png',
        adaptiveIcon: {
          foregroundImage: './assets/branding/sabalist-icon-safe.png',
          backgroundColor: '#E50914',
        },
        googleServicesFile: './google-services.json',
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              {
                scheme: 'https',
                host: 'sabalist.firebaseapp.com',
                pathPrefix: '/__/auth/action',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              {
                scheme: 'https',
                host: 'sabalist.web.app',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
          {
            action: 'VIEW',
            data: [
              {
                scheme: 'sabalist',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      plugins,
      web: {
        bundler: 'webpack',
        favicon: './assets/branding/sabalist-icon-safe.png',
      },
      extra: {
        eas: {
          projectId: '031b7005-9574-45d4-b3a2-9af6a026fcd7',
        },
      },
    },
  };
};
