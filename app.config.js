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
        '@react-native-firebase/crashlytics',
        [
          '@react-native-google-signin/google-signin',
          {
            // v16+ requires iosUrlScheme to register the OAuth callback URL
            // scheme. Without this, Google Sign-In crashes the iOS app.
            iosUrlScheme:
              'com.googleusercontent.apps.231273918004-2h81pu77f4obv9u114ivprf6lv5fk1c4',
          },
        ],
        'expo-apple-authentication',
        [
          'expo-image-picker',
          {
            cameraPermission:
              'Sabalist uses your camera to let you take photos for your listings — for example, snapping a picture of an item you want to sell directly from the create-listing screen.',
            photosPermission:
              'Sabalist accesses your photo library so you can pick existing photos and videos from your gallery to attach to your listings.',
            // We never record video inside the app — videos are only
            // picked from the library — so we explicitly opt out of the
            // microphone permission rather than show a misleading
            // unused-permission prompt to reviewers/users.
            microphonePermission: false,
          },
        ],
        [
          'expo-build-properties',
          {
            ios: {
              deploymentTarget: '15.1',
              useFrameworks: 'static',
              buildReactNativeFromSource: true,
            },
            // Android release stays UN-minified on purpose. The 1.5.1 (build 25)
            // AAB shipped with R8 off (class names readable, no proguard map),
            // yet still crashed at startup — so R8 stripping is NOT the cause.
            // Keep these explicit so a future default flip can't silently
            // enable obfuscation and change the picture.
            android: {
              enableProguardInReleaseBuilds: false,
              enableShrinkResourcesInReleaseBuilds: false,
            },
          },
        ],
        // Build 26 startup-crash fix: back-port java.time.* (API 26+) onto
        // Android 7.0/7.1 (API 24/25) via core library desugaring.
        './plugins/withAndroidCoreLibraryDesugaring',
        './plugins/withIosPods',
      ];

  console.log(`[app.config.js] isWebOnly=${isWebOnly}, plugins=${plugins.length}`);

  return {
    ...config,
    name: 'Sabalist',
    slug: 'sabalist',
    owner: 'afrson',
    version: '1.5.5',
    // EAS Update (OTA): JS/UI/logic changes publish over-the-air with `eas update`
    // and reach installed apps without a new store build. runtimeVersion is tied to
    // the app version string: publish OTA updates WITHOUT bumping `version` and they
    // reach this build; bump `version` + rebuild only for native changes (new SDK,
    // native deps, permissions, icons, splash, bundle id, Expo SDK upgrade).
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      url: 'https://u.expo.dev/031b7005-9574-45d4-b3a2-9af6a026fcd7',
      fallbackToCacheTimeout: 0,
    },
    orientation: 'portrait',
    icon: './assets/branding/sabalist-icon-square.png',
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
      buildNumber: '26',
      icon: './assets/branding/sabalist-icon-square.png',
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './ios/GoogleService-Info.plist',
      usesAppleSignIn: true,
      associatedDomains: [
        'applinks:sabalist.page.link',
      ],
      // Push Notifications capability is required by Firebase iOS Phone
      // Auth: even when we don't ship push notifications, Firebase calls
      // registerForRemoteNotifications during silent-push verification.
      // Without `aps-environment`, that call crashes in production builds.
      // EAS Build syncs this with Apple Developer Portal automatically via
      // the ASC API key.
      entitlements: {
        'aps-environment': 'production',
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Camera + Photo Library descriptions live in the
        // expo-image-picker plugin config above — duplicating them here
        // is unnecessary and risks drift. Microphone is intentionally
        // omitted: we never record audio in this app.
        NSLocationWhenInUseUsageDescription:
          'Sabalist uses your location to show you nearby listings and local marketplace results based on your current city — for example, items for sale in Nairobi or Lagos — and to autofill your city when you create a new listing. You can deny this permission and enter your city manually.',
        // Explicit defaults — Firebase swizzling must be enabled for the
        // reCAPTCHA URL callback to be intercepted by FIRAuth.
        FirebaseAppDelegateProxyEnabled: true,
        // Explicit URL schemes for OAuth redirect handlers. The first is
        // Firebase's REVERSED_CLIENT_ID (used by Google Sign-In and by
        // Phone-Auth's reCAPTCHA fallback). The second is the app's own
        // scheme for email magic-link return.
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.231273918004-2h81pu77f4obv9u114ivprf6lv5fk1c4',
            ],
          },
          {
            CFBundleURLSchemes: ['sabalist'],
          },
        ],
      },
    },
    android: {
      package: 'com.sabalist.app',
      versionCode: 33,
      icon: './assets/branding/sabalist-icon-square.png',
      adaptiveIcon: {
        foregroundImage: './assets/branding/sabalist-icon-square.png',
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
      favicon: './assets/branding/sabalist-icon-square.png',
    },
    extra: {
      eas: {
        projectId: '031b7005-9574-45d4-b3a2-9af6a026fcd7',
      },
    },
  };
};
