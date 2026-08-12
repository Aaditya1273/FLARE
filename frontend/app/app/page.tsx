"use client";

import Link from "next/link";
import { IconShield, IconLock, IconCheckShield, IconArrowRight } from "@/components/icons";
import { isDeployed, getFlareContract, explorerAddressUrl } from "@/lib/flare";

const ACTIONS = [
  {
    href: "/app/shield",
    icon: IconShield,
    title: "1. Shield FXRP",
    body: "Move FXRP into the confidential vault behind a commitment hash. The amount is never stored on-chain in plaintext — only a cryptographic commitment is recorded.",
    badge: "Step 1",
  },
  {
    href: "/app/policy",
    icon: IconLock,
    title: "2. Set Private Policy",
    body: "Encrypt a stop-loss trigger or payroll batch client-side. The ciphertext goes on-chain; only the TEE can decrypt it. No one — not even the server — sees your rule.",
    badge: "Step 2",
  },
  {
    href: "/app/prove",
    icon: IconCheckShield,
    title: "3. Prove & Settle",
    body: "Request a TEE-signed attestation. Prove solvency above a threshold without revealing your balance. Trigger settlement on-chain via the TEE's cryptographic signature.",
    badge: "Step 3",
  },
];

export default function OverviewPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Status */}
      <div>
        <h1 className="text-base font-semibold text-term-text">SILENT — Confidential XRPFi</h1>
        <p className="mt-1 text-sm text-term-muted">
          {isDeployed
            ? "Contracts are live on Flare Coston2. Work through the three steps below to shield, govern, and settle privately."
            : "Contracts are not yet deployed on this network — every action below runs in demo mode."}
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col gap-3 rounded-2xl border border-term-border bg-term-panel/70 p-6 shadow-xl shadow-black/10 backdrop-blur transition hover:border-violet-400/40 hover:bg-term-panel"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300">
                <a.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-term-muted">{a.badge}</span>
            </div>
            <h3 className="text-sm font-medium text-term-text">{a.title}</h3>
            <p className="text-sm leading-relaxed text-term-muted">{a.body}</p>
            <span className="mt-auto flex items-center gap-1 text-xs font-medium text-violet-300">
              Open
              <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Contract link */}
      {isDeployed && (
        <div className="rounded-2xl border border-term-border bg-term-panel/50 px-5 py-4 text-xs text-term-muted">
          SilentVault:{" "}
          <a
            className="font-mono underline decoration-term-border underline-offset-2 hover:text-violet-300"
            href={explorerAddressUrl(getFlareContract("silentVault"))}
            target="_blank"
            rel="noreferrer"
          >
            {getFlareContract("silentVault")}
          </a>
        </div>
      )}
    </div>
  );
}
