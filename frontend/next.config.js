/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "@x402/core": "./lib/empty-shim.js",
      "@x402/core/client": "./lib/empty-shim.js",
      "@x402/evm": "./lib/empty-shim.js",
      "@x402/evm/exact/client": "./lib/empty-shim.js",
      "@x402/evm/upto/client": "./lib/empty-shim.js",
      "@x402/svm": "./lib/empty-shim.js",
      "@x402/svm/exact/client": "./lib/empty-shim.js",
    },
  },
};

module.exports = nextConfig;
