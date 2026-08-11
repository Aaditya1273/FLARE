const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // RainbowKit's Coinbase Smart Wallet connector pulls in @coinbase/cdp-sdk's
    // optional x402 payment support, which isn't installed and isn't used by
    // SILENT (we only need standard wallet connect/sign flows).
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return config;
  },
};

module.exports = nextConfig;
