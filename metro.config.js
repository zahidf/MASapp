const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add CSV to supported asset extensions
config.resolver.assetExts.push("csv");

module.exports = config;
