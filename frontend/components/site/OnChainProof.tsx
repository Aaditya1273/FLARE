"use client";

import { Reveal } from "@/components/Reveal";
import { Section, Eyebrow } from "./primitives";
import { explorerTxUrl } from "@/lib/flare";

// Real transactions from the live Coston2 end-to-end run documented in
// docs/DEPLOY.md (order #1, StopLoss). Row 5 has no tx because the reserve
// attestation was verified locally — the ledger stays honest about that.
const ROWS: {
  n: number;
  entrypoint: string;
  title: string;
  desc: string;
  tx: string | null;
}[] = [
  {
    n: 1,
    entrypoint: "shield(bytes32)",
    title: "Shield FXRP",
    desc: "1.0 FXRP pulled behind a keccak commitment — no amount on-chain, only the hash.",
    tx: "0xb4dbd51756c06f075128847248f1d722173481f51c6874d7ec2921f998082c9a",
  },
  {
    n: 2,
    entrypoint: "setEncryptedPolicy(bytes)",
    title: "Set a private policy",
    desc: "A stop-loss policy encrypted client-side (ECIES to the TEE pubkey) — orderId 1.",
    tx: "0xdb52730b460e2764b52803c6e8ff765cd5647701e188a8adfcc83dbfddc926b8",
  },
  {
    n: 3,
    entrypoint: "tick(1)",
    title: "Keeper forwards",
    desc: "A permissionless tick re-emits the ciphertext the keeper cannot decrypt.",
    tx: "0x85ec3b5eff4a1d552c0adb84f46095c57c9e12e7c6c2aa1277aacd8d05e7cbe1",
  },
  {
    n: 4,
    entrypoint: "settle(1, target, …)",
    title: "Attested settlement",
    desc: "The TEE signed inside the enclave; on-chain, the attestation was verified, the FTSO price re-checked fresh, and 0.4 FXRP released.",
    tx: "0x240ee7204843b581644ab52778416c4e8ebb2343cfcf42065e4ba7a2563d7383",
  },
  {
    n: 5,
    entrypoint: "proveReserves(attestation, threshold)",
    title: "Prove reserves",
    desc: "The TEE attested reserves above the threshold; an inflated threshold was refused (422) instead of forged.",
    tx: null,
  },
];

export default function OnChainProof() {
  return (
    <Section id="proof" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <Eyebrow>Proof, on-chain</Eyebrow>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-term-text sm:text-5xl">
            The settlement path, already executed.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-term-muted sm:text-xl">
            Not a mockup. These are real transactions on Flare Coston2 — the
            full shield → encrypt → tick → settle → prove-reserves loop from
            docs/DEPLOY.md. Tap a hash to inspect it on the explorer.
          </p>
        </Reveal>

        {/* vertical ledger of proof rows */}
        <div className="mt-14 flex flex-col">
          {ROWS.map((s, i) => {
            const n = String(s.n).padStart(2, "0");
            const isLast = i === ROWS.length - 1;

            return (
              <Reveal key={s.n} delay={i * 0.06} className="relative flex gap-5 sm:gap-7">
                {/* numbered rail */}
                <div className="flex flex-col items-center">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-term-border bg-term-panel font-mono text-[13px] text-term-text">
                    {n}
                  </span>
                  {!isLast && <span aria-hidden className="mt-1 w-px flex-1 bg-term-border" />}
                </div>

                {/* content */}
                <div className={`flex-1 ${isLast ? "pb-0" : "pb-10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-term-text">{s.title}</h3>
                    <span
                      aria-hidden
                      title="Verified on-chain"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-term-border text-[11px] text-term-green"
                    >
                      ✓
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] leading-relaxed text-term-muted">{s.desc}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-term-border pt-4">
                    <span className="rounded-md border border-term-border bg-term-panel/60 px-2 py-1 font-mono text-[11px] text-term-violet">
                      {s.entrypoint}
                    </span>
                    {s.tx ? (
                      <a
                        href={explorerTxUrl(s.tx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-term-text/70 transition-colors hover:text-term-violet"
                      >
                        {s.tx.slice(0, 12)}…{s.tx.slice(-6)} ↗
                      </a>
                    ) : (
                      <span className="font-mono text-[12px] text-term-muted">
                        attested in this run — see DEPLOY.md
                      </span>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
