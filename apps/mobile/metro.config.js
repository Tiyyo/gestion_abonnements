const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
  if (moduleName === 'kysely/migration') {
    const kysely = resolve(context, 'kysely', platform);
    return { type: 'sourceFile', filePath: path.join(path.dirname(kysely.filePath), 'migration', 'migrator.js') };
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
