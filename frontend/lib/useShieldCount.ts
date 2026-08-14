"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { getFlareContract, isDeployed } from "./flare";

const DEPLOY_BLOCK = BigInt(33_995_383);
const LOG_CHUNK = BigInt(300);

const SHIELD_EVENT = {
  type: "event" as const,
  name: "Shielded",
  inputs: [
    { name: "user", type: "address" as const, indexed: true },
    { name: "commitment", type: "bytes32" as const, indexed: true },
    { name: "eventTimestamp", type: "uint256" as const, indexed: false },
  ],
} as const;

// Count of Shielded events on SilentVault2 — a COUNT, never an amount. Showing
// a total-value number anywhere (even as a marketing stat) would contradict the
// entire product. Returns null while loading / when not deployed.
export function useShieldCount(): number | null {
  const publicClient = usePublicClient();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!publicClient || !isDeployed) return;
    let cancelled = false;

    (async () => {
      try {
        const vault = getFlareContract("silentVault");
        const latest = await publicClient.getBlockNumber();
        let n = 0;
        for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK) {
          const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
          try {
            const logs = await publicClient.getLogs({
              address: vault,
              event: SHIELD_EVENT,
              fromBlock: from,
              toBlock: to,
            });
            n += logs.length;
          } catch {
            /* skip failed chunk */
          }
        }
        if (!cancelled) setCount(n);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  return count;
}
