const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native'];

// Mock native wallet SDKs that thirdweb bundles but we don't use
const emptyModule = require.resolve('./emptyModule.js');
const cryptoShim = require.resolve('./cryptoShim.js');
const MOCKED_MODULES = [
  '@coinbase/wallet-mobile-sdk',
  '@coinbase/wallet-mobile-sdk/build/WalletMobileSDKEVMProvider',
  '@mobile-wallet-protocol/client',
  '@aws-sdk/client-kms',
  '@aws-sdk/client-lambda',
  '@aws-sdk/credential-providers',
  'react-native-aes-gcm-crypto',
  'react-native-passkey',
  'react-native-quick-crypto',
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (MOCKED_MODULES.includes(moduleName)) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  if (moduleName === 'crypto') {
    return { type: 'sourceFile', filePath: cryptoShim };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
