import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const accounts = PRIVATE_KEY ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    coston2: {
      url: process.env.COSTON2_RPC || "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts,
    },
    songbird: {
      url: process.env.SONGBIRD_RPC || "https://songbird-api.flare.network/ext/C/rpc",
      chainId: 19,
      accounts,
    },
    flare: {
      url: process.env.FLARE_RPC || "https://flare-api.flare.network/ext/C/rpc",
      chainId: 14,
      accounts,
    },
  },
};

export default config;
