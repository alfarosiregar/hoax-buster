const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .cjs files (required by Firebase 10+)
config.resolver.sourceExts.push('cjs');

// Disable unstable package exports to fix Firebase module resolution issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
