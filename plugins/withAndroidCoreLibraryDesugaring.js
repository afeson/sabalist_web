/**
 * withAndroidCoreLibraryDesugaring — Expo config plugin.
 *
 * Back-ports java.time.* (and other API 26+ std-lib APIs) onto Android 7.0/7.1
 * (API 24/25) via Android core-library desugaring. This is the fix for the
 * build-26 startup crash (java.time.* NoClassDefFoundError) on older devices.
 *
 * Referenced from app.config.js (native/EAS builds only — excluded for web).
 * Edits android/app/build.gradle to:
 *   - compileOptions { coreLibraryDesugaringEnabled true }
 *   - dependencies   { coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.4" }
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const DESUGAR_LIB = 'com.android.tools:desugar_jdk_libs:2.1.4';

module.exports = function withAndroidCoreLibraryDesugaring(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1) enable desugaring inside the existing compileOptions { } block
    if (!/coreLibraryDesugaringEnabled\s+true/.test(src)) {
      if (/compileOptions\s*\{/.test(src)) {
        src = src.replace(/compileOptions\s*\{/, (m) => `${m}\n        coreLibraryDesugaringEnabled true`);
      } else {
        // no compileOptions block yet — add one inside android { }
        src = src.replace(/android\s*\{/, (m) => `${m}\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }`);
      }
    }

    // 2) add the desugar library to dependencies { }
    if (!src.includes('desugar_jdk_libs')) {
      if (/dependencies\s*\{/.test(src)) {
        src = src.replace(/dependencies\s*\{/, (m) => `${m}\n    coreLibraryDesugaring "${DESUGAR_LIB}"`);
      } else {
        src = `${src}\ndependencies {\n    coreLibraryDesugaring "${DESUGAR_LIB}"\n}\n`;
      }
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
