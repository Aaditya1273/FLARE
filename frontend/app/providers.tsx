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
import { WagmiProvider } from "wagmi";
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
