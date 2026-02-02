const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if we already added our fix
        if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
          // Find the post_install block and add our fix
          const postInstallRegex = /(post_install do \|installer\|)/;

          if (postInstallRegex.test(podfileContent)) {
            podfileContent = podfileContent.replace(
              postInstallRegex,
              `$1
    # Fix for React Native Firebase non-modular header errors
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`
            );
          } else {
            // No post_install block, add one at the end before the last 'end'
            podfileContent = podfileContent.replace(
              /(\nend\s*)$/,
              `
post_install do |installer|
  # Fix for React Native Firebase non-modular header errors
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
end
$1`
            );
          }

          fs.writeFileSync(podfilePath, podfileContent);
        }
      }

      return config;
    },
  ]);
}

module.exports = withFirebaseFix;
