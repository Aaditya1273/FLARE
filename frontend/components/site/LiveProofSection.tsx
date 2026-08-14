"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Reveal } from "@/components/Reveal";
import { Section, Eyebrow } from "./primitives";
import { CountUp } from "./CountUp";
import { getFlareContract, explorerAddressUrl, TEE_BASE_URL, isDeployed } from "@/lib/flare";

const DEPLOY_BLOCK = BigInt(33_995_383);
const LOG_CHUNK = BigInt(300);

const SHIELD_EVENT = {
  type: "event" as const,
  name: "Shielded",
  inputs: [
    { name: "user", type: "address" as const, indexed: true },
    { name: "commitment", type: "bytes32" as const, indexed: true },
    { name: "eventTimestamp", type: "uint256" as const, indexed: false },
  ],
} as const;

/// Deliberately does NOT show a total-value-shielded number - that number
/// existing anywhere, even as a marketing stat, would contradict the entire
/// product. Every stat here is either a count (never an amount) or a fully
/// public value (the FTSO price everyone can already read).
export function LiveProofSection() {
  const publicClient = usePublicClient();
  const [shieldCount, setShieldCount] = useState<number | null>(null);
  const [xrpUsd, setXrpUsd] = useState<number | null>(null);
  const [teeId, setTeeId] = useState<string | null>(null);
  const [codeHash, setCodeHash] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || !isDeployed) return;
    let cancelled = false;

    (async () => {
      try {
        const vault = getFlareContract("silentVault");
        const latest = await publicClient.getBlockNumber();
        let count = 0;
        for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK) {
          const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
          try {
            const logs = await publicClient.getLogs({ address: vault, event: SHIELD_EVENT, fromBlock: from, toBlock: to });
            count += logs.length;
          } catch {
            /* skip failed chunk */
          }
        }
        if (!cancelled) setShieldCount(count);
      } catch {
        if (!cancelled) setShieldCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  useEffect(() => {
    fetch(`${TEE_BASE_URL}/api/price`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.price && setXrpUsd(d.price))
      .catch(() => {});
    fetch(`${TEE_BASE_URL}/api/attest/proof`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.teeId) setTeeId(d.teeId);
        if (d?.codeVersionHash) setCodeHash(d.codeVersionHash);
      })
      .catch(() => {});
  }, []);

  const vault = getFlareContract("silentVault");

  return (
    <Section className="py-24 text-center md:py-32" id="proof">
      <Reveal>
        <Eyebrow className="justify-center">Live on Coston2</Eyebrow>
        <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-term-text sm:text-5xl">
          Every commitment on-chain.
          <br />
          Every amount hidden.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-14">
          <div className="font-mono text-6xl font-semibold tracking-tight text-term-text sm:text-7xl">
            {shieldCount != null ? <CountUp to={shieldCount} /> : <span className="text-term-muted">—</span>}
          </div>
          <div className="mt-3 text-xs uppercase tracking-[0.16em] text-term-muted">
            Shield events recorded — commitment only, amount never on-chain
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-term-border bg-term-surface/[0.04] text-left">
          <div className="flex items-center gap-2 border-b border-term-border px-5 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-term-green animate-pulse" />
            <span className="font-mono text-[12px] text-term-muted">SilentVault2 — read live from Coston2</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-term-border sm:grid-cols-4">
            <Stat label="XRP / USD" value={xrpUsd ? `$${xrpUsd.toFixed(4)}` : "—"} sub="FTSOv2 feed" />
            <Stat label="TEE ID" value={teeId ? short(teeId) : "—"} sub="attestation signer" />
            <Stat label="Code hash" value={codeHash ? codeHash.slice(0, 10) : "—"} sub="reproducible build" />
            <Stat
              label="Vault"
              value={short(vault)}
              sub="explorer ↗"
              href={isDeployed ? explorerAddressUrl(vault) : undefined}
            />
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function short(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[11px] uppercase tracking-[0.12em] text-term-muted">{label}</div>
      <div className="mt-2 font-mono text-lg font-semibold text-term-text">{value}</div>
      <div className="mt-1 text-[11px] text-term-muted">{sub}</div>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block bg-term-bg p-5 transition hover:bg-term-surface/[0.05]">
        {inner}
      </a>
    );
  }
  return <div className="bg-term-bg p-5">{inner}</div>;
}
