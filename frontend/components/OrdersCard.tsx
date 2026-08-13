"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { getFlareContract, explorerTxUrl } from "@/lib/flare";

const DEPLOY_BLOCK = BigInt(33_995_383);
const LOG_CHUNK = BigInt(300);

const POLICY_SET_EVENT = {
  type: "event" as const,
  name: "PolicySet",
  inputs: [
    { name: "orderId", type: "uint256" as const, indexed: true },
    { name: "commitment", type: "bytes32" as const, indexed: true },
    { name: "policyHash", type: "bytes32" as const, indexed: false },
  ],
} as const;

const SETTLED_EVENT = {
  type: "event" as const,
  name: "Settled",
  inputs: [
    { name: "orderId", type: "uint256" as const, indexed: true },
    { name: "trigger", type: "uint256" as const, indexed: false },
    { name: "attestation", type: "bytes" as const, indexed: false },
  ],
} as const;

type Order = {
  orderId: string;
  commitment: string;
  policyHash: string;
  status: "Pending" | "Executed";
  settleTxHash?: string;
};

/// Live order table: scans SilentVault2's PolicySet and Settled events across
/// the whole vault (not just the connected wallet) so anyone can watch the
/// keeper's permissionless tick loop and the TEE's settlement decisions play
/// out on-chain, without ever seeing a policy's plaintext.
export function OrdersCard() {
  const publicClient = usePublicClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrders() {
    if (!publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const vault = getFlareContract("silentVault");
      const latest = await publicClient.getBlockNumber();
      const policySet: { orderId: bigint; commitment: string; policyHash: string }[] = [];
      const settled = new Map<string, string>(); // orderId => tx hash

      for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK) {
        const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
        try {
          const [policyLogs, settledLogs] = await Promise.all([
            publicClient.getLogs({ address: vault, event: POLICY_SET_EVENT, fromBlock: from, toBlock: to }),
            publicClient.getLogs({ address: vault, event: SETTLED_EVENT, fromBlock: from, toBlock: to }),
          ]);
          for (const log of policyLogs) {
            const args = log.args as { orderId?: bigint; commitment?: string; policyHash?: string };
            if (args.orderId !== undefined) {
              policySet.push({ orderId: args.orderId, commitment: args.commitment ?? "", policyHash: args.policyHash ?? "" });
            }
          }
          for (const log of settledLogs) {
            const args = log.args as { orderId?: bigint };
            if (args.orderId !== undefined) settled.set(args.orderId.toString(), log.transactionHash ?? "");
          }
        } catch {
          /* skip failed chunk, continue scanning */
        }
      }

      const parsed: Order[] = policySet
        .map((p) => ({
          orderId: p.orderId.toString(),
          commitment: p.commitment,
          policyHash: p.policyHash,
          status: settled.has(p.orderId.toString()) ? ("Executed" as const) : ("Pending" as const),
          settleTxHash: settled.get(p.orderId.toString()),
        }))
        .reverse();

      setOrders(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-term-text">Live Orders</h2>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="rounded-lg border border-term-border px-3 py-1 text-[11px] text-term-muted hover:text-term-text hover:border-violet-400/40 transition disabled:opacity-40"
        >
          {loading ? "Scanning…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-400">{error}</div>}

      {!loading && orders.length === 0 && !error && (
        <div className="rounded-2xl border border-term-border bg-term-panel/50 p-6 text-center text-sm text-term-muted">
          No orders yet — set a private policy to open one.
        </div>
      )}

      {orders.length > 0 && (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.orderId} className="rounded-xl border border-term-border bg-term-panel/60 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${o.status === "Executed" ? "bg-term-green" : "bg-term-amber animate-pulse"}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-term-text">Order #{o.orderId}</span>
                  <span className="font-mono text-[10px] text-term-muted break-all">{o.commitment}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-[11px] font-medium ${o.status === "Executed" ? "text-term-green" : "text-term-amber"}`}>{o.status}</span>
                {o.settleTxHash && (
                  <a className="text-[10px] text-term-muted underline hover:text-term-text" href={explorerTxUrl(o.settleTxHash)} target="_blank" rel="noreferrer">
                    settle tx →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
