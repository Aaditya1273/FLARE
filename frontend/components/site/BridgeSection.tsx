"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";

// Dark interlude between the stack section and the proof ledger — gives the
// page a breath before the numbers, mirroring the reference layout's pacing.
export default function BridgeSection() {
  return (
    <section className="relative overflow-hidden bg-black py-28 text-center sm:py-36">
      <svg
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[120%] w-[140%] -translate-x-1/2"
        viewBox="0 0 1000 600"
        fill="none"
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.ellipse
            key={i}
            cx="500"
            cy="640"
            rx={260 + i * 130}
            ry={220 + i * 110}
            stroke="rgba(139,92,246,0.14)"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: i * 0.15 }}
          />
        ))}
      </svg>

      <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-term-violet">
            <span className="h-px w-5 bg-term-violet/50" />
            Shield first. Prove later.
          </div>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Where standing intent becomes
            <br />
            on-chain proof.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">
            What you plan to do stays private. What was done is attested —
            signed by the TEE, re-checked against a fresh FTSO price, anchored
            by FDC evidence.{" "}
            <span className="italic text-white/80">Shield first. Prove later.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
