"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { ERC20_ABI, SILENT_VAULT_ABI } from "@/lib/abi";
import { getFlareContract, FXRP_DECIMALS, TEE_BASE_URL, explorerAddressUrl } from "@/lib/flare";

// Exact block at which the current SilentVault was deployed on Coston2
// (confirmed via eth_getCode binary search: 33_995_392).
// Updating this keeps scan ranges minimal and history load fast.
const DEPLOY_BLOCK = BigInt(33_995_392);
// Coston2 public RPC accepts up to 300 blocks per getLogs when filtering
// by contract address + indexed topic (user address). Unfiltered calls
// are limited to 30 blocks, but those are never made here.
const LOG_CHUNK = BigInt(300);

type Stats = {
  walletBalance: bigint | null;
  vaultBalance: bigint | null;
  xrpUsd: number | null;
  shieldCount: number | null;
  walletError?: string;
  vaultError?: string;
  priceError?: string;
  historyError?: string;
};



export function DashboardCard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fxrp  = getFlareContract("fxrp")  as `0x${string}`;
  const vault  = getFlareContract("silentVault") as `0x${string}`;

  async function fetchStats() {
    if (!publicClient || !address) return;
    setLoading(true);
    const s: Stats = {
      walletBalance: null, vaultBalance: null,
      xrpUsd: null, shieldCount: null,
    };

    // Wallet FXRP balance
    try {
      s.walletBalance = await publicClient.readContract({
        address: fxrp, abi: ERC20_ABI, functionName: "balanceOf", args: [address],
      }) as bigint;
    } catch (e) { s.walletError = e instanceof Error ? e.message : "failed"; }

    // Vault total FXRP balance
    try {
      s.vaultBalance = await publicClient.readContract({
        address: fxrp, abi: ERC20_ABI, functionName: "balanceOf", args: [vault],
      }) as bigint;
    } catch (e) { s.vaultError = e instanceof Error ? e.message : "failed"; }

    // XRP/USD from TEE (FTSO-backed)
    try {
      const r = await fetch(`${TEE_BASE_URL}/api/price`);
      if (r.ok) {
        const data = await r.json();
        s.xrpUsd = data.price ?? null;
      }
    } catch { s.priceError = "TEE unreachable"; }

    // Shield event count via paginated getLogs
    try {
      // Run a quick scan of only the most recent 3000 blocks (100 chunks × 30) to get
      // a recent shield count. Full history scan runs on the History page separately.
      const latest = await publicClient.getBlockNumber();
      const scanFrom = latest - BigInt(3000) > DEPLOY_BLOCK ? latest - BigInt(3000) : DEPLOY_BLOCK;
      let count = 0;
      const shieldEventDef = {
        type: "event" as const,
        name: "Shielded",
        inputs: [
          { name: "user",           type: "address" as const, indexed: true  },
          { name: "commitment",     type: "bytes32"  as const, indexed: true  },
          { name: "eventTimestamp", type: "uint256" as const, indexed: false },
        ],
      };
      for (let from = scanFrom; from <= latest; from += LOG_CHUNK) {
        const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
        try {
          const logs = await publicClient.getLogs({
            address: vault,
            event: shieldEventDef,
            args: { user: address as `0x${string}` },
            fromBlock: from,
            toBlock: to,
          });
          count += logs.length;
        } catch { /* skip chunk */ }
      }
      s.shieldCount = count;
    } catch (e) { s.historyError = e instanceof Error ? e.message : "failed"; }

    setStats(s);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchStats();
      const t = setInterval(fetchStats, 30_000);
      return () => clearInterval(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-term-border bg-term-panel/50 p-6 text-sm text-term-muted">
        Connect your wallet to see your vault dashboard.
      </div>
    );
  }

  const fxrpWallet = stats?.walletBalance != null ? parseFloat(formatUnits(stats.walletBalance, FXRP_DECIMALS)) : null;
  const fxrpVault  = stats?.vaultBalance  != null ? parseFloat(formatUnits(stats.vaultBalance,  FXRP_DECIMALS)) : null;
  const usdWallet  = fxrpWallet != null && stats?.xrpUsd ? (fxrpWallet * stats.xrpUsd).toFixed(2) : null;
  const usdVault   = fxrpVault  != null && stats?.xrpUsd ? (fxrpVault  * stats.xrpUsd).toFixed(2) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-term-muted">
          {loading ? "Fetching from Coston2…" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="rounded-lg border border-term-border px-3 py-1 text-[11px] text-term-muted hover:text-term-text hover:border-violet-400/40 transition disabled:opacity-40"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Vault Balance"
          value={loading && fxrpVault == null ? "…" : fxrpVault != null ? `${fxrpVault.toLocaleString()} FXRP` : "—"}
          sub={usdVault ? `≈ $${usdVault}` : stats?.vaultError ? "fetch error" : undefined}
          accent="violet"
          live
        />
        <StatCard
          label="Wallet Balance"
          value={loading && fxrpWallet == null ? "…" : fxrpWallet != null ? `${fxrpWallet.toLocaleString()} FXRP` : "—"}
          sub={usdWallet ? `≈ $${usdWallet}` : stats?.walletError ? "fetch error" : undefined}
          accent="default"
        />
        <StatCard
          label="XRP / USD"
          value={loading && stats?.xrpUsd == null ? "…" : stats?.xrpUsd ? `$${stats.xrpUsd.toFixed(4)}` : "—"}
          sub={stats?.priceError ?? "FTSO live feed"}
          accent="green"
        />
        <StatCard
          label="Shield Events"
          value={loading && stats?.shieldCount == null ? "…" : stats?.shieldCount != null ? String(stats.shieldCount) : "—"}
          sub={stats?.historyError ?? "on-chain events"}
          accent="default"
        />
      </div>

      <div className="rounded-xl border border-term-border/20 bg-term-surface/[0.04] px-4 py-3 text-[11px] text-term-muted flex flex-col gap-1">
        <span className="text-term-text font-medium text-xs mb-1">Contracts on Coston2</span>
        <ContractRow label="SilentVault" address={vault} />
        <ContractRow label="FXRP Token"  address={fxrp} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, live }: {
  label: string; value: string; sub?: string; accent: "violet" | "green" | "default"; live?: boolean;
}) {
  const accentClass = { violet: "text-violet-300", green: "text-term-green", default: "text-term-text" }[accent];
  return (
    <div className="rounded-xl border border-term-border bg-term-panel/60 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-term-muted">
        {label}
        {live && <span className="h-1.5 w-1.5 rounded-full bg-term-green animate-pulse" />}
      </div>
      <div className={`text-lg font-semibold ${accentClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-term-muted">{sub}</div>}
    </div>
  );
}

function ContractRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0">{label}:</span>
      <a
        href={explorerAddressUrl(address)}
        target="_blank"
        rel="noreferrer"
        className="break-all font-mono hover:text-term-text hover:underline transition-colors"
      >
        {address}
      </a>
    </div>
  );
}
