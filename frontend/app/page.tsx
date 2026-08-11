"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCard } from "@/components/ShieldCard";
import { PrivatePolicyCard } from "@/components/PrivatePolicyCard";
import { ProveCard } from "@/components/ProveCard";
import { getFlareContract, explorerAddressUrl, isDeployed } from "@/lib/flare";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between border-b border-term-border pb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-100">
            SILENT <span className="text-term-muted">/ Confidential XRPFi OS</span>
          </h1>
          <p className="mt-1 text-xs text-term-muted">
            Private institutional treasury and settlement rail for XRP on Flare Coston2.
          </p>
        </div>
        <ConnectButton />
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ShieldCard />
        <PrivatePolicyCard />
        <ProveCard />
      </section>

      <footer className="mt-4 flex flex-col gap-1 border-t border-term-border pt-4 text-[11px] text-term-muted">
        <span>
          Network: Flare Testnet Coston2 (chainId 114){" "}
          {!isDeployed && <span className="text-term-amber">— contracts not configured</span>}
        </span>
        {isDeployed && (
          <span>
            SilentVault:{" "}
            <a className="underline" href={explorerAddressUrl(getFlareContract("silentVault"))} target="_blank" rel="noreferrer">
              {getFlareContract("silentVault")}
            </a>
          </span>
        )}
      </footer>
    </main>
  );
}
