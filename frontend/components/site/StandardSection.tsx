"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/site/CountUp";
import { Section, Eyebrow } from "./primitives";
import { useShieldCount } from "@/lib/useShieldCount";
import { useLiveStats } from "@/lib/useLiveStats";
import { getFlareContract, explorerAddressUrl, isDeployed } from "@/lib/flare";

const PILLS = [
  "Live on Flare Coston2",
  "4 primitives, registry-resolved",
  "SIMULATED_TEE, honestly documented",
];

function short(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function StandardSection() {
  const shieldCount = useShieldCount();
  const { xrpUsd, teeId, codeHash } = useLiveStats();
  const vault = getFlareContract("silentVault");

  const stats = [
    { l: "XRP / USD", v: xrpUsd ? `$${xrpUsd.toFixed(4)}` : "—", sub: "FTSOv2 feed" },
    { l: "TEE ID", v: teeId ? short(teeId) : "—", sub: "attestation signer" },
    { l: "Code hash", v: codeHash ? codeHash.slice(0, 10) : "—", sub: "reproducible build" },
    {
      l: "Vault",
      v: short(vault),
      sub: "explorer ↗",
      href: isDeployed ? explorerAddressUrl(vault) : undefined,
    },
  ];

  return (
    <Section className="py-24 text-center sm:py-32">
      <div className="mx-auto mb-14 flex flex-col items-center justify-center gap-y-1.5 text-center font-mono text-[12px] uppercase tracking-[0.12em] text-term-muted sm:flex-row sm:gap-x-5 sm:gap-y-2">
        {PILLS.map((pill, i) => (
          <Fragment key={pill}>
            {i > 0 && <span className="hidden text-term-border sm:inline">·</span>}
            <span>{pill}</span>
          </Fragment>
        ))}
      </div>

      <Reveal>
        <Eyebrow className="justify-center">Why SILENT</Eyebrow>
        <h2 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-term-text sm:text-5xl">
          Private intent.
          <br />
          Proven settlement.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-term-muted sm:text-xl">
          Standing policy — a stop price, a payroll batch, a redemption intent —
          never touches the ledger. The TEE evaluates it privately, then
          settlement is proven on-chain: attestation, fresh FTSO price, FDC
          evidence.
        </p>
      </Reveal>

      {/* big animated value — a count, never an amount */}
      <Reveal delay={0.1}>
        <div className="mt-16">
          <div className="text-6xl font-semibold tracking-tight text-term-text sm:text-8xl">
            {shieldCount != null ? (
              <CountUp to={shieldCount} />
            ) : (
              <span className="inline-block h-14 w-72 animate-pulse rounded-2xl bg-term-panel align-middle sm:h-20 sm:w-80" />
            )}
          </div>
          <div className="mx-auto mt-3 max-w-xs text-balance text-xs uppercase tracking-[0.14em] text-term-muted sm:max-w-none sm:text-sm sm:tracking-[0.16em]">
            commitments shielded — amount never on-chain
          </div>
        </div>
      </Reveal>

      {/* protocol dashboard card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-3xl border border-term-border bg-term-panel/40 shadow-xl shadow-black/10"
      >
        <div className="flex items-center gap-2 border-b border-term-border px-5 py-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-term-green" />
          <span className="font-mono text-[12px] text-term-muted">
            SilentVault2 — read live from Coston2
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-term-border sm:grid-cols-4">
          {stats.map((c) =>
            c.href ? (
              <a
                key={c.l}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="block bg-term-bg p-5 text-left transition hover:bg-term-panel/60"
              >
                <div className="text-[11px] uppercase tracking-wider text-term-muted">{c.l}</div>
                <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-term-text">
                  {c.v}
                </div>
                <div className="mt-1 text-[11px] text-term-muted">{c.sub}</div>
              </a>
            ) : (
              <div key={c.l} className="bg-term-bg p-5 text-left">
                <div className="text-[11px] uppercase tracking-wider text-term-muted">{c.l}</div>
                <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-term-text">
                  {c.v}
                </div>
                <div className="mt-1 text-[11px] text-term-muted">{c.sub}</div>
              </div>
            )
          )}
        </div>
      </motion.div>
    </Section>
  );
}
