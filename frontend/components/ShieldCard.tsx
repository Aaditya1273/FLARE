"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits } from "viem";
import { ERC20_ABI, SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, isDeployed, explorerTxUrl, TEE_BASE_URL, FXRP_DECIMALS } from "@/lib/flare";
import { fixMetaMaskRpc, isRateLimitError } from "@/lib/rpc";
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
  const [showRpcFix, setShowRpcFix] = useState(false);
  const [fixingRpc, setFixingRpc] = useState(false);

  async function onFixRpc() {
    setFixingRpc(true);
    try {
      await fixMetaMaskRpc();
      setShowRpcFix(false);
      setError("MetaMask RPC updated — please click Shield again.");
    } catch {
      setError(
        "Could not update RPC automatically. In MetaMask → Networks → Coston2 → change RPC to: https://flare-testnet.drpc.org"
      );
    } finally {
      setFixingRpc(false);
    }
  }

  async function onShield() {
    if (!walletClient || !publicClient || !address) return;
    setBusy(true);
    setError(null);
    setShowRpcFix(false);
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

      const amountWei = parseUnits(amount, FXRP_DECIMALS);
      const vault = getFlareContract("silentVault");
      const fxrp = getFlareContract("fxrp");

      // Pre-fetch gas via publicClient (9 fallback RPCs) so MetaMask's own
      // preflight eth_estimateGas is pre-empted with an explicit gas value.
      setStatus("Estimating gas...");
      // Coston2 is a legacy (pre-EIP-1559) network — use gasPrice, not maxFeePerGas.
      const [gasPrice, approveGas] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.estimateContractGas({
          address: fxrp, abi: ERC20_ABI, functionName: "approve",
          args: [vault, amountWei], account: address,
        }),
      ]);

      setStatus("Approving FXRP...");
      const approveHash = await walletClient.writeContract({
        address: fxrp,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vault, amountWei],
        gas: (approveGas * 130n) / 100n,
        gasPrice,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const shieldGas = await publicClient.estimateContractGas({
        address: vault, abi: SILENT_VAULT_ABI, functionName: "shield",
        args: [amountWei, newCommitment as `0x${string}`], account: address,
      });

      setStatus("Shielding FXRP into vault...");
      const shieldHash = await walletClient.writeContract({
        address: vault,
        abi: SILENT_VAULT_ABI,
        functionName: "shield",
        args: [amountWei, newCommitment as `0x${string}`],
        gas: (shieldGas * 130n) / 100n,
        gasPrice,
      });
      await publicClient.waitForTransactionReceipt({ hash: shieldHash });

      setTxHash(shieldHash);
      setStatus("Shielded.");
      // Persist commitment so Step 2 can auto-populate
      if (typeof window !== "undefined") {
        localStorage.setItem("silent:lastCommitment", newCommitment);
      }
    } catch (e) {
      const isRateLimit = isRateLimitError(e);
      setError(
        isRateLimit
          ? "Your MetaMask Coston2 RPC is rate-limited. Click below to fix it automatically."
          : e instanceof Error ? e.message : "Shield failed"
      );
      if (isRateLimit) setShowRpcFix(true);
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
      {showRpcFix && (
        <button
          className={`${buttonClass} w-full`}
          onClick={onFixRpc}
          disabled={fixingRpc}
        >
          {fixingRpc ? "Updating MetaMask RPC..." : "⚡ Fix MetaMask RPC — one click"}
        </button>
      )}
      {commitment && (
        <Banner tone="green">
          On-chain: commitment only — amount hidden.
          <div className="mt-1 break-all font-mono text-[10px] text-term-muted">{commitment}</div>
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
