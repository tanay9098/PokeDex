// Shim for Node.js 'crypto' module in React Native environment.
// thirdweb's x402/sign.js does: require("crypto").webcrypto
// React Native exposes the Web Crypto API on the global `crypto` object.
module.exports = {
  webcrypto: global.crypto,
  getRandomValues: (buffer) => global.crypto.getRandomValues(buffer),
};
