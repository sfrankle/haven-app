const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Allow .sql files to be required as string modules (see lib/db/sql-loader.js)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'sql'];
config.transformer.babelTransformerPath = require.resolve('./src/lib/db/sql-loader.js');

module.exports = config;
