const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withIosPods(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfile = fs.readFileSync(podfilePath, "utf8");

      // Per-pod modular headers for Firebase dependencies
      const perPodHeaders = [
        "GoogleUtilities",
        "FirebaseCoreInternal",
        "FirebaseCore",
        "FirebaseAuth",
        "FirebaseStorage",
        "FirebaseAppCheckInterop",
        "FirebaseAuthInterop",
        "GTMSessionFetcher",
        "RecaptchaInterop",
      ];

      const podOverrides = perPodHeaders
        .map((name) => `  pod '${name}', :modular_headers => true`)
        .join("\n");

      if (!podfile.includes("modular_headers => true")) {
        const targetRegex = /(target\s+['"][^'"]+['"]\s+do\s*\n)/;
        const match = podfile.match(targetRegex);

        if (match) {
          podfile = podfile.replace(
            targetRegex,
            `$1\n  # Firebase pods need modular headers for static framework compatibility\n${podOverrides}\n\n`
          );
        } else {
          console.warn("[withIosPods] WARNING: Could not find target...do line.");
          const doLineRegex = /(^.*target.*do.*$)/m;
          podfile = podfile.replace(
            doLineRegex,
            `$1\n\n  # Firebase pods need modular headers\n${podOverrides}\n`
          );
        }
      }

      // Fix non-modular header includes for RNFB targets
      if (!podfile.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        const postInstallRegex = /(post_install do \|installer\|)/;

        const postInstallCode = `
    # Fix non-modular header includes for React Native Firebase targets
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('Google')
        target.build_configurations.each do |build_config|
          build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`;

        if (postInstallRegex.test(podfile)) {
          podfile = podfile.replace(
            postInstallRegex,
            `$1${postInstallCode}`
          );
        } else {
          podfile = podfile.replace(
            /(\nend\s*)$/,
            `
  post_install do |installer|${postInstallCode}
  end
$1`
          );
        }
        console.log("[withIosPods] Added CLANG_ALLOW fix for RNFB targets");
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log("[withIosPods] Podfile modifications complete");
      return config;
    },
  ]);
};
