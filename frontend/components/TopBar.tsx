"use client";

import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { isDeployed } from "@/lib/flare";

const TITLES: Record<string, string> = {
  "/app": "Overview",
  "/app/shield": "Shield FXRP",
  "/app/policy": "Private Policy",
  "/app/prove": "Prove & Settle",
};

export function TopBar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  const { disconnect } = useDisconnect();

  return (
    <header className="flex items-center justify-between border-b border-term-border bg-term-bg/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-term-text">{title}</h1>
        <p className="text-xs text-term-muted">
          Flare Testnet Coston2 {!isDeployed && <span className="text-term-amber">— demo mode</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ConnectButton showBalance={false} chainStatus="icon" />
        <button
          onClick={() => disconnect()}
          className="rounded-xl border border-term-border px-3 py-2 text-xs font-medium text-term-muted transition hover:border-red-400/40 hover:text-red-300"
        >
          Disconnect
        </button>
      </div>
    </header>
  );
}
