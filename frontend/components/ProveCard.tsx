"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, TEE_BASE_URL, FXRP_DECIMALS } from "@/lib/flare";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

export function ProveCard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<{ teeId: string; codeVersionHash: string; verified: boolean } | null>(null);

  async function onProve() {
    if (!publicClient || !address) return;
    setBusy(true);
    setError(null);
    setProof(null);
    try {
      const thresholdWei = parseUnits(threshold, FXRP_DECIMALS);

      const proofRes = await fetch(`${TEE_BASE_URL}/api/attest/proof`);
      if (!proofRes.ok) throw new Error("TEE /api/attest/proof unreachable");
      const { teeId, codeVersionHash } = await proofRes.json();

      const reservesRes = await fetch(`${TEE_BASE_URL}/api/attest/reserves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: address, threshold: thresholdWei.toString() }),
      });
      if (!reservesRes.ok) throw new Error("TEE /api/attest/reserves unreachable");
      const { attestation } = await reservesRes.json();

      const vault = getFlareContract("silentVault");
      const verified = await publicClient.readContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "proveReserves",
        args: [attestation as `0x${string}`, thresholdWei],
        account: address,
      });

      setProof({ teeId, codeVersionHash, verified: Boolean(verified) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prove failed");
    } finally {
      setBusy(false);
    }
  }

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
          placeholder="1000000"
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
        {busy ? "Verifying with TEE..." : "Prove Reserves"}
      </button>
      {error && <Banner tone="amber">{error}</Banner>}
      {proof && (
        <Banner tone={proof.verified ? "green" : "amber"}>
          {proof.verified
            ? `TEE attests reserves > ${threshold} FXRP — Verified on-chain.`
            : "TEE attestation did not verify above threshold."}
          <div className="mt-1 text-[10px] text-term-muted">
            TEE ID: <span className="break-all">{proof.teeId}</span>
            <br />
            Code hash: <span className="break-all">{proof.codeVersionHash}</span>
          </div>
        </Banner>
      )}
    </Panel>
  );
}
