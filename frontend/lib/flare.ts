import { defineChain } from "viem";
import deployments from "./deployments.json";

export const coston2 = defineChain({
  id: 114,
  name: "Flare Testnet Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
  },
  testnet: true,
});

type Deployment = {
  chainId: number;
  registry: string;
  fxrp: string;
  teeSigner: string;
  silentPolicyRegistry: string;
  silentVault: string;
};

const deployment: Deployment | undefined = (deployments as Record<string, Deployment>).coston2;

// Zero addresses mean "not yet deployed" - every card checks this and renders a
// demo-mode banner instead of sending a doomed transaction.
export const isDeployed = Boolean(deployment && deployment.silentVault);

export function getFlareContract(name: "silentVault" | "silentPolicyRegistry" | "fxrp") {
  return (deployment?.[name] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
}

export function explorerTxUrl(hash: string) {
  return `${coston2.blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddressUrl(address: string) {
  return `${coston2.blockExplorers.default.url}/address/${address}`;
}

export const TEE_BASE_URL = process.env.NEXT_PUBLIC_TEE_URL || "http://localhost:8000";

// Real FXRP on Coston2 uses 6 decimals (like XRP drops), not the 18-decimal ERC20
// default - confirmed by calling decimals() on 0x0b6A3645c240605887a5532109323A3E12273dc7.
export const FXRP_DECIMALS = 6;
