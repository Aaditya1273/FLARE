"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, TEE_BASE_URL, FXRP_DECIMALS, explorerAddressUrl } from "@/lib/flare";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

type Proof = {
  teeId: string;
  codeVersionHash: string;
  attestation: string;
  verified: boolean;
  blockNumber: bigint;
};

const STEPS = [
  "Contacting TEE for identity proof...",
  "Requesting signed attestation from TEE...",
  "Verifying attestation on Coston2 (eth_call)...",
  "Confirmed.",
];

export function ProveCard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);

  async function onProve() {
    if (!publicClient || !address) return;
    setBusy(true);
    setError(null);
    setProof(null);
    setStep(0);

    try {
      const thresholdWei = parseUnits(threshold, FXRP_DECIMALS);

      setStep(0);
      const proofRes = await fetch(`${TEE_BASE_URL}/api/attest/proof`);
      if (!proofRes.ok) {
        const body = await proofRes.json().catch(() => ({}));
        throw new Error(body.error || "TEE /api/attest/proof unreachable");
      }
      const { teeId, codeVersionHash } = await proofRes.json();

      setStep(1);
      const commitment = typeof window !== "undefined" ? localStorage.getItem("silent:lastCommitment") : null;
      if (!commitment) throw new Error("No known commitment for this wallet — shield FXRP first (Step 1).");
      const reservesRes = await fetch(`${TEE_BASE_URL}/api/attest/reserves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: address, threshold: thresholdWei.toString(), commitments: [commitment] }),
      });
      if (!reservesRes.ok) {
        const body = await reservesRes.json().catch(() => ({}));
        throw new Error(body.error || "TEE /api/attest/reserves unreachable");
      }
      const { attestation } = await reservesRes.json();

      setStep(2);
      const vault = getFlareContract("silentVault");
      const [verified, blockNumber] = await Promise.all([
        publicClient.readContract({
          address: vault,
          abi: SILENT_VAULT_ABI,
          functionName: "proveReserves",
          args: [attestation as `0x${string}`, thresholdWei],
          account: address,
        }),
        publicClient.getBlockNumber(),
      ]);

      setStep(3);
      setProof({ teeId, codeVersionHash, attestation, verified: Boolean(verified), blockNumber });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prove failed");
    } finally {
      setBusy(false);
    }
  }

  const vault = getFlareContract("silentVault");

  return (
    <Panel title="3. Prove & Settle">
      {!isDeployed && (
        <Banner tone="amber">Contracts not yet deployed on this network — demo mode.</Banner>
      )}
      <Field label="Reserve threshold (FXRP)">
        <input
          className={inputClass}
          type="number"
          step="any"
          placeholder="0.1"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          disabled={busy}
        />
      </Field>

      <button
        className={buttonClass}
        disabled={!isConnected || !threshold || busy}
        onClick={onProve}
      >
        {busy ? STEPS[step] : "Prove Reserves"}
      </button>

      {busy && (
        <div className="flex flex-col gap-1">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-[11px] transition-all ${
                i < step ? "text-term-green" : i === step ? "text-term-text" : "text-term-muted/40"
              }`}
            >
              <span>{i < step ? "✓" : i === step ? "›" : "·"}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {error && <Banner tone="amber">{error}</Banner>}

      {proof && (
        <div className="flex flex-col gap-2">
          <Banner tone={proof.verified ? "green" : "amber"}>
            {proof.verified
              ? `✓ TEE attests reserves > ${threshold} FXRP — Verified on-chain at block #${proof.blockNumber.toString()}.`
              : "TEE attestation did not verify above threshold."}
          </Banner>

          {/* Full cryptographic receipt */}
          <div className="rounded-xl border border-term-border/20 bg-term-surface/[0.04] p-3 text-[11px] font-mono leading-relaxed">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-term-muted">Cryptographic verification receipt</div>
            <div className="flex flex-col gap-1.5">
              <Row label="Method" value="proveReserves (view — no tx)" />
              <Row label="Block" value={`#${proof.blockNumber.toString()}`} />
              <Row label="TEE ID" value={proof.teeId} />
              <Row label="Code hash" value={proof.codeVersionHash} />
              <Row label="Attestation" value={proof.attestation} />
              <Row label="Threshold" value={`${threshold} FXRP`} />
              <Row label="Result" value={proof.verified ? "true ✓" : "false ✗"} highlight={proof.verified} />
            </div>
          </div>

          {/* Explain why no explorer log */}
          <div className="rounded-xl border border-term-border/20 bg-term-surface/[0.04] px-3 py-2 text-[11px] text-term-muted leading-relaxed">
            <span className="text-term-text font-semibold">Why no explorer log?</span>{" "}
            <code className="text-term-text">proveReserves</code> is a <code className="text-term-text">view</code> function —
            it reads & verifies state but never writes. View calls never create transactions, emit events, or appear in
            explorer logs. That&apos;s correct Ethereum behaviour. The attestation signature above <em>is</em> the
            proof — anyone can call <code className="text-term-text">proveReserves(attestation, threshold)</code> on the
            contract and independently get the same <code className="text-term-text">true</code> result.
          </div>

          <div className="flex flex-col gap-1.5">
            <a
              href={`https://coston2-explorer.flare.network/block/${proof.blockNumber.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-term-muted underline hover:text-term-text transition-colors"
            >
              View block #{proof.blockNumber.toString()} on Coston2 Explorer →
            </a>
            <a
              href={explorerAddressUrl(vault)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-term-muted underline hover:text-term-text transition-colors"
            >
              Inspect SilentVault → call proveReserves yourself →
            </a>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <span className="text-term-muted shrink-0">{label}:</span>
      <span className={`break-all ${highlight ? "text-term-green font-semibold" : "text-term-text"}`}>{value}</span>
    </div>
  );
}
