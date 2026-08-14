"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { IntelligenceGlow } from "@/components/IntelligenceGlow";
import { Reveal } from "@/components/Reveal";

// Stable per-step metadata
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
  const containerRef = useRef<HTMLElement>(null);

  // Track scroll progress through the 400vh section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Update active step based on scroll progress
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 4 steps total. latest goes from 0.0 to 1.0.
    let index = Math.floor(latest * STEPS.length);
    if (index >= STEPS.length) index = STEPS.length - 1;
    if (index < 0) index = 0;
    
    if (index !== active) {
      setActive(index);
    }
  });

  return (
    <section ref={containerRef} id="how" className="relative bg-black h-[400vh]">
      {/* Sticky container that stays fixed while scrolling through the 400vh */}
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <IntelligenceGlow className="right-[-240px] top-[-240px] h-[560px] w-[560px]" />

        <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8">
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
                <motion.div
                  key={s.n}
                  layout
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`group relative flex min-h-[170px] flex-col rounded-2xl border p-6 text-left lg:min-h-[300px] lg:p-7 ${
                    isActive
                      ? "border-transparent bg-white lg:flex-[2.4]"
                      : "border-white/12 bg-white/[0.04] backdrop-blur-sm lg:flex-1"
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

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ opacity: { duration: 0.2 }, height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <p className="mt-3 text-[14px] leading-relaxed text-term-muted">{s.body}</p>
                            <div className="mt-5 border-t border-term-border pt-4">
                              <span className="font-mono text-[12px] text-term-violet">{s.tag}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
