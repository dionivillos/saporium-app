// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's generated migration bundle imports the raw .sql files.
config.resolver.sourceExts.push('sql');

module.exports = config;
