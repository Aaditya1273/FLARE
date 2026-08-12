/**
 * Programmatically instruct MetaMask to use a reliable Coston2 RPC.
 * `wallet_addEthereumChain` will update the network if it already exists
 * in the wallet, ensuring MetaMask's own eth_call / eth_estimateGas calls
 * go through a non-rate-limited node instead of the default flare.network one.
 *
 * drpc.org is chosen as primary: it has no tracking, no rate limits on free tier,
 * and is geographically distributed.
 */
export async function fixMetaMaskRpc(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) return;
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: "0x72", // 114
        chainName: "Flare Testnet Coston2",
        nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
        rpcUrls: [
          "https://flare-testnet.drpc.org",
          "https://lb.routeme.sh/rpc/evm/114",
          "https://coston2-api.flare.network/ext/C/rpc",
        ],
        blockExplorerUrls: ["https://coston2-explorer.flare.network"],
      },
    ],
  });
}

/** Returns true if the error looks like an RPC rate-limit masquerading as a revert. */
export function isRateLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("rate-limit");
}
