const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const emptyModule = path.resolve(__dirname, 'src/shims/emptyModule.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Node SSR needs the real stream/fs modules. Firebase's Node build extends
  // stream.Readable, which throws if those modules are replaced with {}.
  const environment = context.customResolverOptions?.environment;
  const isServer = environment === 'node' || environment === 'react-server';
  if (!isServer && (moduleName === 'fs' || moduleName === 'stream')) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
