"use client";

import { useState, useEffect } from "react";
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

  // Auto-populate from the last Shield step
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("silent:lastCommitment");
      if (saved) setCommitment(saved);
    }
  }, []);

  function isValidCommitment(c: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(c); // bytes32 = 32 bytes = 64 hex chars
  }

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
    if (!isValidCommitment(commitment)) {
      setError("Invalid commitment — paste the 0x bytes32 hash from Step 1 (Shield). It's 66 characters starting with 0x.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const policy = buildPolicy();
      const { ciphertextHex, policyHash } = await encryptPolicy(policy);

      const registry = getFlareContract("silentPolicyRegistry");
      const vault = getFlareContract("silentVault");
      const commitmentBytes = commitment as `0x${string}`;

      // Coston2 is a legacy (pre-EIP-1559) network — use gasPrice.
      const [gasPrice, setPolicyGas] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.estimateContractGas({
          address: registry, abi: SILENT_POLICY_REGISTRY_ABI,
          functionName: "setPolicy", args: [commitmentBytes, ciphertextHex, policyHash],
          account: walletClient.account,
        }),
      ]);

      const setPolicyHash = await walletClient.writeContract({
        address: registry,
        abi: SILENT_POLICY_REGISTRY_ABI,
        functionName: "setPolicy",
        args: [commitmentBytes, ciphertextHex, policyHash],
        gas: (setPolicyGas * 130n) / 100n,
        gasPrice,
      });
      await publicClient.waitForTransactionReceipt({ hash: setPolicyHash });

      const vaultGas = await publicClient.estimateContractGas({
        address: vault, abi: SILENT_VAULT_ABI,
        functionName: "setEncryptedPolicy", args: [commitmentBytes, policyHash],
        account: walletClient.account,
      });

      const vaultTxHash = await walletClient.writeContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "setEncryptedPolicy",
        args: [commitmentBytes, policyHash],
        gas: (vaultGas * 130n) / 100n,
        gasPrice,
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
      <Field label="Commitment (from Shield — auto-filled)">
        <input
          className={`${inputClass} font-mono text-xs`}
          placeholder="0x... (32-byte hash from Step 1)"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          disabled={busy}
        />
        {commitment && !isValidCommitment(commitment) && (
          <p className="text-[11px] text-red-400 mt-1">
            ⚠ This doesn&apos;t look like a bytes32 hash. Copy the commitment from Step 1&apos;s green banner.
          </p>
        )}
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
