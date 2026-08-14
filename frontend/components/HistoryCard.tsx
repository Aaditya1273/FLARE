"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { getFlareContract, explorerTxUrl } from "@/lib/flare";

// Exact block at which the current SilentVault was deployed on Coston2
// (confirmed via eth_getCode binary search).
const DEPLOY_BLOCK = BigInt(33_995_392);
// Coston2 public RPC accepts up to 300 blocks per getLogs when filtering
// by contract address + indexed user topic. Keep at 300 for speed.
const LOG_CHUNK = BigInt(300);

const SHIELD_EVENT = {
  type: "event" as const,
  name: "Shielded",
  inputs: [
    { name: "user",           type: "address" as const, indexed: true  },
    { name: "commitment",     type: "bytes32"  as const, indexed: true  },
    { name: "eventTimestamp", type: "uint256" as const, indexed: false },
  ],
} as const;

type ShieldEvent = {
  txHash: string;
  blockNumber: bigint;
  commitment: string;
  timestamp: number | null;
};

export function HistoryCard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<ShieldEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const vault = getFlareContract("silentVault") as `0x${string}`;

  async function fetchHistory() {
    if (!publicClient || !address) return;
    setLoading(true);
    setError(null);
    setProgress("Fetching your shield events…");
    try {
      const latest = await publicClient.getBlockNumber();
      const allLogs: ShieldEvent[] = [];

      // Scan in chunks — Coston2 public RPC caps getLogs at 350 blocks per call.
      // We only scan from DEPLOY_BLOCK so the number of chunks stays small.
      const totalChunks = Number((latest - DEPLOY_BLOCK) / LOG_CHUNK) + 1;
      let chunks = 0;
      for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK) {
        const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
        chunks++;
        setProgress(`Scanning ${chunks}/${totalChunks}…`);
        try {
          const logs = await publicClient.getLogs({
            address: vault,
            event: SHIELD_EVENT,
            args: { user: address as `0x${string}` },
            fromBlock: from,
            toBlock: to,
          });
          for (const log of logs) {
            allLogs.push({
              txHash:      log.transactionHash ?? "",
              blockNumber: log.blockNumber,
              commitment:  (log.args as { commitment?: string }).commitment ?? "",
              timestamp:   null,
            });
          }
        } catch { /* skip failed chunk */ }
      }

      // Fetch block timestamps only for blocks that actually had events (max 10)
      if (allLogs.length > 0) {
        setProgress("Fetching timestamps…");
        const uniqueBlocks = [...new Set(allLogs.map((e) => e.blockNumber))].slice(0, 10);
        const blockMap = new Map<bigint, number>();
        await Promise.allSettled(
          uniqueBlocks.map(async (bn) => {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockMap.set(bn, Number(block.timestamp));
          })
        );
        allLogs.forEach((ev) => { ev.timestamp = blockMap.get(ev.blockNumber) ?? null; });
      }

      setEvents([...allLogs].reverse());
      setProgress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch history");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected && address) fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-term-border bg-term-panel/50 p-6 text-sm text-term-muted">
        Connect your wallet to view your activity history.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-term-text">Shield History</h2>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="rounded-lg border border-term-border px-3 py-1 text-[11px] text-term-muted hover:text-term-text hover:border-violet-400/40 transition disabled:opacity-40"
        >
          {loading ? "Scanning…" : "↻ Refresh"}
        </button>
      </div>

      {/* Live scan progress */}
      {loading && progress && (
        <div className="rounded-xl border border-term-border/20 bg-term-surface/[0.04] px-3 py-2 text-[11px] text-term-muted font-mono flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
          {progress}
        </div>
      )}

      {/* Skeleton while first load */}
      {loading && events.length === 0 && (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-term-surface/[0.06]" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-400">
          {error}
        </div>
      )}

      {!loading && events.length === 0 && !error && (
        <div className="rounded-2xl border border-term-border bg-term-panel/50 p-6 text-center text-sm text-term-muted">
          No shield events found for your address on Coston2.
        </div>
      )}

      {events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((ev, i) => (
            <div key={ev.txHash + i} className="rounded-xl border border-term-border bg-term-panel/60 px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-term-green shrink-0" />
                  <span className="text-sm font-semibold text-term-text">
                    FXRP Shielded — amount hidden
                  </span>
                </div>
                <span className="text-[10px] text-term-muted shrink-0">
                  {ev.timestamp
                    ? new Date(ev.timestamp * 1000).toLocaleString()
                    : `Block #${ev.blockNumber.toString()}`}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-0.5 text-[11px] font-mono">
                <DetailRow label="Commitment" value={ev.commitment} />
                <DetailRow label="Block"      value={`#${ev.blockNumber.toString()}`} />
                <DetailRow label="Tx"         value={ev.txHash} link={explorerTxUrl(ev.txHash)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-term-muted leading-relaxed">
        Fetched live from on-chain <code className="text-term-text">Shielded</code> events on
        the SilentVault2 contract. Scanning in 300-block chunks from block #{DEPLOY_BLOCK.toString()} to latest.
      </div>
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-term-muted w-20 shrink-0">{label}:</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="break-all text-violet-300 hover:underline">
          {value}
        </a>
      ) : (
        <span className="break-all text-term-text">{value}</span>
      )}
    </div>
  );
}
