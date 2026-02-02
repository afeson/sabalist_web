module.exports = ({ config }) => {
  // Include native plugins for:
  // - EAS builds (EAS_BUILD=true)
  // - expo prebuild (creates android/ios folders)
  // - expo run:android / run:ios
  // Exclude ONLY for web (expo start --web)
  const isWebOnly = process.env.EXPO_PUBLIC_PLATFORM === 'web' ||
    (process.argv.some(arg => arg.includes('start')) && process.argv.some(arg => arg.includes('--web')));

  // Native plugins - always include unless explicitly web-only
  const plugins = isWebOnly
    ? []
    : [
        '@react-native-firebase/app',
        '@react-native-firebase/auth',
        '@react-native-google-signin/google-signin',
        [
          'expo-build-properties',
          {
            ios: {
              useFrameworks: 'static',
              deploymentTarget: '15.1',
            },
          },
        ],
      ];

  console.log(`[app.config.js] isWebOnly=${isWebOnly}, plugins=${plugins.length}`);

  return {
    ...config,
    name: 'Sabalist',
    slug: 'sabalist',
    owner: 'afrson',
    version: '1.2.8',
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
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './ios/GoogleService-Info.plist',
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
      versionCode: 19,
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
  };
};
