const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native'];

// Mock native wallet SDKs that thirdweb bundles but we don't use
const emptyModule = require.resolve('./emptyModule.js');
const MOCKED_MODULES = [
  '@coinbase/wallet-mobile-sdk',
  '@mobile-wallet-protocol/client',
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (MOCKED_MODULES.includes(moduleName)) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
