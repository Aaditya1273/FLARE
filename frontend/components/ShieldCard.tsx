"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { ERC20_ABI, SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, explorerTxUrl, TEE_BASE_URL } from "@/lib/flare";
import { Panel, Banner, Field, inputClass, buttonClass } from "./Panel";

export function ShieldCard() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onShield() {
    if (!walletClient || !publicClient || !address) return;
    setBusy(true);
    setError(null);
    setStatus("Requesting commitment from TEE...");
    try {
      const shieldRes = await fetch(`${TEE_BASE_URL}/api/shield`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, user: address }),
      });
      if (!shieldRes.ok) throw new Error("TEE /api/shield unreachable");
      const { commitment: newCommitment } = await shieldRes.json();
      setCommitment(newCommitment);

      const amountWei = parseEther(amount);
      const vault = getFlareContract("silentVault");
      const fxrp = getFlareContract("fxrp");

      setStatus("Approving FXRP...");
      const approveHash = await walletClient.writeContract({
        address: fxrp,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vault, amountWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setStatus("Shielding FXRP into vault...");
      const shieldHash = await walletClient.writeContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "shield",
        args: [amountWei, newCommitment as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: shieldHash });

      setTxHash(shieldHash);
      setStatus("Shielded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shield failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="1. Shield FXRP">
      {!isDeployed && (
        <Banner tone="amber">Contracts not yet deployed on this network — demo mode.</Banner>
      )}
      <Field label="Amount (FXRP)">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="any"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </Field>
      <button
        className={buttonClass}
        disabled={!isConnected || !amount || busy}
        onClick={onShield}
      >
        {busy ? status || "Working..." : "Shield"}
      </button>
      {error && <Banner tone="amber">{error}</Banner>}
      {commitment && (
        <Banner tone="green">
          On-chain: commitment only — amount hidden.
          <div className="mt-1 break-all font-mono text-[10px] text-gray-300">{commitment}</div>
          {txHash && (
            <a className="mt-1 block underline" href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
              View transaction on Coston2 Explorer →
            </a>
          )}
        </Banner>
      )}
    </Panel>
  );
}
