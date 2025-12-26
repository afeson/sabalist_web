const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.resolver = {
  ...config.resolver,
  blockList: [
    // Exclude Docker directories
    /.*\/Docker\/.*/,
    // Exclude gcloud directories
    /.*\/gcloud\/.*/,
    // Exclude AppData roaming temp directories
    /.*\/AppData\/Roaming\/gcloud\/.*/,
    /.*\/AppData\/Local\/Docker\/.*/,
  ],
};

module.exports = config;
