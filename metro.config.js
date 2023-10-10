// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('cjs');

config.resolver.sourceExts.push(
    'jsx', 'js', 'ts', 'tsx', 'cjs', 'mjs', 'json' 
  );

module.exports = config;


