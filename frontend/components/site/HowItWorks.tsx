"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IntelligenceGlow } from "@/components/IntelligenceGlow";
import { Reveal } from "@/components/Reveal";

// Stable per-step metadata (number + contract tag); copy is baked in because
// SILENT is English-only for now.
const STEPS = [
  {
    n: "01",
    tag: "SilentVault2 · shield(bytes32)",
    title: "Shield FXRP",
    body: "FXRP moves into SilentVault behind a keccak commitment. No amount is ever stored or emitted on-chain — only the hash exists in public state.",
  },
  {
    n: "02",
    tag: "setEncryptedPolicy(bytes)",
    title: "Set a private policy",
    body: "A stop-loss, trailing stop, payroll batch, or guaranteed redemption is encrypted client-side to the TEE pubkey in a fixed 256-byte frame — the policy type itself stays hidden.",
  },
  {
    n: "03",
    tag: "settle(orderId, …)",
    title: "Prove & settle",
    body: "The TEE evaluates the policy against the live FTSO feed inside the enclave and signs. On-chain, SilentVault verifies the attestation, a fresh price, and the FDC proof before releasing funds.",
  },
  {
    n: "04",
    tag: "proveReserves(attestation, threshold)",
    title: "Attest reserves",
    body: "Prove reserves exceed a threshold without revealing the balance — proof-of-reserves that doesn't make the audit trail the vulnerability.",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="relative isolate overflow-hidden bg-black py-20 sm:py-32">
      <IntelligenceGlow className="right-[-240px] top-[-240px] h-[560px] w-[560px]" />

      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-term-violet">
            <span className="h-px w-5 bg-term-violet/50" />
            How it works
          </div>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            From shield to settlement, every step on-chain.
          </h2>
        </Reveal>

        {/* Accordion cards: stacked & compact on mobile (all four stay visible),
            flex row with the active card expanding on desktop (lg+). */}
        <div className="mt-12 flex flex-col gap-3 lg:flex-row lg:gap-4">
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <motion.button
                key={s.n}
                layout
                onClick={() => setActive(i)}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative flex min-h-[170px] flex-col rounded-2xl border p-6 text-left lg:min-h-[300px] lg:p-7 ${
                  isActive
                    ? "border-transparent bg-white lg:flex-[2.4]"
                    : "border-white/12 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.07] lg:flex-1"
                }`}
              >
                {!isActive && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-term-violet/20 blur-2xl"
                  />
                )}
                <motion.span
                  layout
                  className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-[13px] ${
                    isActive ? "border-term-border text-term-violet" : "border-white/25 text-white/70"
                  }`}
                >
                  {s.n}
                </motion.span>

                <div className="mt-auto pt-4">
                  <motion.h3
                    layout="position"
                    className={`font-semibold ${isActive ? "text-black text-lg lg:text-xl" : "text-white text-lg lg:text-xl"}`}
                  >
                    {s.title}
                  </motion.h3>

                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <p className="mt-3 text-[14px] leading-relaxed text-term-muted">{s.body}</p>
                      <div className="mt-5 border-t border-term-border pt-4">
                        <span className="font-mono text-[12px] text-term-violet">{s.tag}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
