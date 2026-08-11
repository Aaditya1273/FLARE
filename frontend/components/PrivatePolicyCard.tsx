"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { SILENT_POLICY_REGISTRY_ABI, SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, explorerTxUrl } from "@/lib/flare";
import { encryptPolicy } from "@/lib/crypto";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

type PolicyType = "stop-loss" | "payroll";

export function PrivatePolicyCard() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [policyType, setPolicyType] = useState<PolicyType>("stop-loss");
  const [commitment, setCommitment] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [batchCsv, setBatchCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  function buildPolicy(): object {
    if (policyType === "stop-loss") {
      return { type: "stop-loss", trigger_price: triggerPrice };
    }
    const batch = batchCsv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [address, amount] = line.split(",").map((s) => s.trim());
        return { address, amount };
      });
    return { type: "payroll", batch };
  }

  async function onSetPolicy() {
    if (!walletClient || !publicClient || !commitment) return;
    setBusy(true);
    setError(null);
    try {
      const policy = buildPolicy();
      const { ciphertextHex, policyHash } = await encryptPolicy(policy);

      const registry = getFlareContract("silentPolicyRegistry");
      const vault = getFlareContract("silentVault");
      const commitmentBytes = commitment as `0x${string}`;

      const setPolicyHash = await walletClient.writeContract({
        address: registry,
        abi: SILENT_POLICY_REGISTRY_ABI,
        functionName: "setPolicy",
        args: [commitmentBytes, ciphertextHex, policyHash],
      });
      await publicClient.waitForTransactionReceipt({ hash: setPolicyHash });

      const vaultTxHash = await walletClient.writeContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "setEncryptedPolicy",
        args: [commitmentBytes, policyHash],
      });
      await publicClient.waitForTransactionReceipt({ hash: vaultTxHash });

      setTxHash(vaultTxHash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set policy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="2. Set Private Policy">
      {!isDeployed && (
        <Banner tone="amber">Contracts not yet deployed on this network — demo mode.</Banner>
      )}
      <Field label="Commitment (from Shield step)">
        <input
          className={inputClass}
          placeholder="0x..."
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          disabled={busy}
        />
      </Field>
      <Field label="Policy type">
        <select
          className={inputClass}
          value={policyType}
          onChange={(e) => setPolicyType(e.target.value as PolicyType)}
          disabled={busy}
        >
          <option value="stop-loss">Stop-Loss</option>
          <option value="payroll">Payroll Batch</option>
        </select>
      </Field>
      {policyType === "stop-loss" ? (
        <Field label="Trigger price (XRP/USD)">
          <input
            className={inputClass}
            type="number"
            step="any"
            placeholder="0.50"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            disabled={busy}
          />
        </Field>
      ) : (
        <Field label="Batch (address,amount per line)">
          <textarea
            className={`${inputClass} h-24 resize-none`}
            placeholder="0xabc...,100&#10;0xdef...,200"
            value={batchCsv}
            onChange={(e) => setBatchCsv(e.target.value)}
            disabled={busy}
          />
        </Field>
      )}
      <button
        className={buttonClass}
        disabled={!isConnected || !commitment || busy}
        onClick={onSetPolicy}
      >
        {busy ? "Encrypting & submitting..." : "Set Private Policy"}
      </button>
      {error && <Banner tone="amber">{error}</Banner>}
      {txHash && (
        <Banner tone="green">
          Policy encrypted client-side — only ciphertext + hash on-chain.
          <a className="mt-1 block underline" href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
            View transaction on Coston2 Explorer →
          </a>
        </Banner>
      )}
    </Panel>
  );
}
