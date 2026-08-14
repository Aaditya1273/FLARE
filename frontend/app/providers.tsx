"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, fallback, http } from "wagmi";
import { coston2 } from "@/lib/flare";
import { ThemeProvider, useTheme } from "@/lib/theme";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

// Explicit wallet list (no Coinbase/Base Account) - that connector drags in
// @coinbase/cdp-sdk's x402 payment machinery, which SILENT never uses and which
// Turbopack can't resolve as an optional dependency.
const config = getDefaultConfig({
  appName: "SILENT",
  projectId,
  chains: [coston2],
  transports: {
    [coston2.id]: fallback([
      // coston2.enosys.global supports 350-block getLogs ranges — keep it first
      // so History and Dashboard log scans succeed without silent chunk failures.
      http("https://coston2.enosys.global/ext/C/rpc"),
      http("https://lb.routeme.sh/rpc/evm/114"),
      http("https://flare-testnet.drpc.org"),
      http("https://coston2-api.flare.network/ext/C/rpc"),
      http("https://flare-testnet-coston2.rpc.thirdweb.com"),
      http("https://flaretestnet-bundler.etherspot.io"),
      http("https://01-gravelines-005-01.rpc.tatum.io/ext/bc/C/rpc"),
      http("https://02-chicago-005-02.rpc.tatum.io/ext/bc/C/rpc"),
      http("https://02-tokyo-005-03.rpc.tatum.io/ext/bc/C/rpc"),
    ]),
  },
  wallets: [{ groupName: "Recommended", wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet] }],
  ssr: true,
});

const queryClient = new QueryClient();

function RainbowKitThemed({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const rkTheme =
    theme === "light"
      ? lightTheme({ accentColor: "#22c55e", accentColorForeground: "black" })
      : darkTheme({ accentColor: "#22c55e", accentColorForeground: "black" });
  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RainbowKitThemed>{children}</RainbowKitThemed>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
