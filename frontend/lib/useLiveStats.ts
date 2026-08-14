"use client";

import { useEffect, useState } from "react";
import { TEE_BASE_URL } from "./flare";

// Live TEE/feed stats shared by the landing sections: the FTSO XRP/USD price
// the enclave sees, plus the TEE's attestation signer and code version hash.
// All three degrade to null on failure — the UI shows "—" rather than breaking.
export function useLiveStats() {
  const [xrpUsd, setXrpUsd] = useState<number | null>(null);
  const [teeId, setTeeId] = useState<string | null>(null);
  const [codeHash, setCodeHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${TEE_BASE_URL}/api/price`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.price) setXrpUsd(d.price);
      })
      .catch(() => {});
    fetch(`${TEE_BASE_URL}/api/attest/proof`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.teeId) setTeeId(d.teeId);
        if (d?.codeVersionHash) setCodeHash(d.codeVersionHash);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return { xrpUsd, teeId, codeHash };
}
