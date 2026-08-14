"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decodeEventLog } from "viem";
import { SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, getTeePubKey, isDeployed, explorerTxUrl, type PolicyType } from "@/lib/flare";
import { encryptToTee } from "@/lib/ecies";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

const POLICY_LABELS: Record<PolicyType, string> = {
  STOP_LOSS: "Stop-Loss",
  TRAILING_STOP: "Trailing Stop",
  PAYROLL_BATCH: "Payroll Batch",
  GUARANTEED_REDEEM: "Guaranteed Redeem (XRPL)",
};

export function PrivatePolicyCard() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [policyType, setPolicyType] = useState<PolicyType>("STOP_LOSS");
  const [commitment, setCommitment] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [trailFraction, setTrailFraction] = useState("0.10");
  const [batchCsv, setBatchCsv] = useState("");
  const [xrplDestination, setXrplDestination] = useState("");
  const [destinationTag, setDestinationTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("silent:lastCommitment");
      if (saved) setCommitment(saved);
    }
  }, []);

  function isValidCommitment(c: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(c);
  }

  function buildPolicy(): object {
    switch (policyType) {
      case "STOP_LOSS":
        return { type: "STOP_LOSS", commitment, trigger: triggerPrice };
      case "TRAILING_STOP":
        return { type: "TRAILING_STOP", commitment, trailFraction };
      case "PAYROLL_BATCH": {
        const legs = batchCsv
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => {
            const [target, amount] = line.split(",").map((s) => s.trim());
            return { target, amount };
          });
        return { type: "PAYROLL_BATCH", commitment, legs };
      }
      case "GUARANTEED_REDEEM":
        return { type: "GUARANTEED_REDEEM", commitment, xrplDestination, destinationTag: Number(destinationTag) };
    }
  }

  async function onSetPolicy() {
    if (!walletClient || !publicClient || !commitment) return;
    if (!isValidCommitment(commitment)) {
      setError("Invalid commitment — paste the 0x bytes32 hash from Step 1 (Shield).");
      return;
    }
    const teePubKey = getTeePubKey();
    if (!teePubKey || teePubKey === "0x") {
      setError("TEE public key not configured — the extension hasn't been deployed/attested on this network yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const policy = buildPolicy();
      const ciphertext = await encryptToTee(policy, teePubKey);

      const vault = getFlareContract("silentVault");
      const commitmentBytes = commitment as `0x${string}`;

      const gasPrice = await publicClient.getGasPrice();
      const gas = await publicClient.estimateContractGas({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "setEncryptedPolicy",
        args: [commitmentBytes, ciphertext],
        account: walletClient.account,
      });

      const hash = await walletClient.writeContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "setEncryptedPolicy",
        args: [commitmentBytes, ciphertext],
        gas: (gas * 130n) / 100n,
        gasPrice,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: SILENT_VAULT_ABI, data: log.data, topics: log.topics, eventName: "PolicySet" });
          setOrderId(decoded.args.orderId.toString());
          if (typeof window !== "undefined") {
            localStorage.setItem("silent:lastOrderId", decoded.args.orderId.toString());
          }
        } catch {
          /* not a PolicySet log, skip */
        }
      }

      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set policy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="2. Set Private Policy">
      {!isDeployed && <Banner tone="amber">Contracts not yet deployed on this network — demo mode.</Banner>}
      <Field label="Commitment (from Shield — auto-filled)">
        <input
          className={`${inputClass} font-mono text-xs`}
          placeholder="0x... (32-byte hash from Step 1)"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          disabled={busy}
        />
        {commitment && !isValidCommitment(commitment) && (
          <p className="text-[11px] text-red-400 mt-1">⚠ Not a bytes32 hash — copy it from Step 1.</p>
        )}
      </Field>
      <Field label="Policy type">
        <select className={inputClass} value={policyType} onChange={(e) => setPolicyType(e.target.value as PolicyType)} disabled={busy}>
          {Object.entries(POLICY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {policyType === "STOP_LOSS" && (
        <Field label="Trigger price (XRP/USD, FTSO-scaled 5 decimals)">
          <input className={inputClass} type="number" step="any" placeholder="40000" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} disabled={busy} />
        </Field>
      )}
      {policyType === "TRAILING_STOP" && (
        <Field label="Trail fraction (e.g. 0.10 = sell on a 10% pullback from the peak)">
          <input className={inputClass} type="number" step="any" placeholder="0.10" value={trailFraction} onChange={(e) => setTrailFraction(e.target.value)} disabled={busy} />
        </Field>
      )}
      {policyType === "PAYROLL_BATCH" && (
        <Field label="Batch (address,amount per line)">
          <textarea className={`${inputClass} h-24 resize-none`} placeholder="0xabc...,100&#10;0xdef...,200" value={batchCsv} onChange={(e) => setBatchCsv(e.target.value)} disabled={busy} />
        </Field>
      )}
      {policyType === "GUARANTEED_REDEEM" && (
        <>
          <Field label="XRPL destination address">
            <input className={inputClass} placeholder="rXYZ..." value={xrplDestination} onChange={(e) => setXrplDestination(e.target.value)} disabled={busy} />
          </Field>
          <Field label="Destination tag">
            <input className={inputClass} type="number" placeholder="12345" value={destinationTag} onChange={(e) => setDestinationTag(e.target.value)} disabled={busy} />
          </Field>
        </>
      )}

      <button className={buttonClass} disabled={!isConnected || !commitment || busy} onClick={onSetPolicy}>
        {busy ? "Encrypting & submitting..." : "Set Private Policy"}
      </button>
      {error && <Banner tone="amber">{error}</Banner>}
      {txHash && (
        <Banner tone="green">
          Policy encrypted client-side to the TEE&apos;s public key — only 2141 bytes of ciphertext on-chain, same size
          for every policy type.
          {orderId && <div className="mt-1 font-mono text-[11px]">Order ID: {orderId}</div>}
          <a className="mt-1 block underline" href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
            View transaction on Coston2 Explorer →
          </a>
        </Banner>
      )}
    </Panel>
  );
}
