"use client";

import { useState } from "react";
import { usePublicClient } from "wagmi";
import { SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, explorerTxUrl, explorerAddressUrl } from "@/lib/flare";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

type Evidence = {
  orderId: string;
  evidenceHash: string;
  txHash: string;
  blockNumber: bigint;
};

// Block SilentVault2 was deployed on Coston2 - scanning starts here.
const DEPLOY_BLOCK = BigInt(33_995_383);
const LOG_CHUNK = BigInt(300);

/// Shows the FDC-backed evidence trail for a GuaranteedRedeem order: SilentVault2
/// only emits CrossChainEvidenceRecorded after settle() has independently verified
/// an FDC Merkle proof of the corresponding XRPL payment against Flare's
/// FdcVerification contract - this event log IS the on-chain proof the redemption
/// really happened, not a claim from the frontend.
export function ProveFDC() {
  const publicClient = usePublicClient();
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  async function onLookup() {
    if (!publicClient || !orderId) return;
    setBusy(true);
    setError(null);
    setEvidence(null);
    try {
      const vault = getFlareContract("silentVault");
      const latest = await publicClient.getBlockNumber();
      let found: Evidence | null = null;

      for (let from = DEPLOY_BLOCK; from <= latest && !found; from += LOG_CHUNK) {
        const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
        try {
          const logs = await publicClient.getLogs({
            address: vault,
            event: {
              type: "event",
              name: "CrossChainEvidenceRecorded",
              inputs: [
                { name: "orderId", type: "uint256", indexed: true },
                { name: "evidenceHash", type: "bytes32", indexed: false },
              ],
            },
            args: { orderId: BigInt(orderId) },
            fromBlock: from,
            toBlock: to,
          });
          if (logs.length > 0) {
            const log = logs[0];
            found = {
              orderId,
              evidenceHash: (log.args as { evidenceHash?: string }).evidenceHash ?? "",
              txHash: log.transactionHash ?? "",
              blockNumber: log.blockNumber,
            };
          }
        } catch {
          /* skip failed chunk, keep scanning */
        }
      }

      if (!found) throw new Error("No FDC evidence found for this order — it may not have redeemed via GuaranteedRedeem yet.");
      setEvidence(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  const vault = getFlareContract("silentVault");

  return (
    <Panel title="FDC Redemption Proof">
      {!isDeployed && <Banner tone="amber">Contracts not yet deployed on this network — demo mode.</Banner>}
      <Field label="Order ID">
        <input className={inputClass} type="number" placeholder="1" value={orderId} onChange={(e) => setOrderId(e.target.value)} disabled={busy} />
      </Field>
      <button className={buttonClass} disabled={!orderId || busy} onClick={onLookup}>
        {busy ? "Scanning Coston2 for evidence..." : "Look Up FDC Evidence"}
      </button>
      {error && <Banner tone="amber">{error}</Banner>}
      {evidence && (
        <Banner tone="green">
          ✓ FDC Merkle proof verified on-chain for order #{evidence.orderId} — the XRPL redemption payment was
          independently proven against Flare&apos;s FdcVerification contract before this order&apos;s settle() succeeded.
          <div className="mt-2 flex flex-col gap-1 font-mono text-[10px]">
            <span>Evidence hash: {evidence.evidenceHash}</span>
            <a className="underline" href={explorerTxUrl(evidence.txHash)} target="_blank" rel="noreferrer">
              View settle() transaction on Coston2 Explorer →
            </a>
            <a className="underline" href={explorerAddressUrl(vault)} target="_blank" rel="noreferrer">
              Inspect SilentVault2 →
            </a>
          </div>
        </Banner>
      )}
    </Panel>
  );
}
