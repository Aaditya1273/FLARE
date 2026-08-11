"use client";

import { motion } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ParallaxField } from "./ParallaxField";
import { IconArrowRight } from "./icons";
import { isDeployed } from "@/lib/flare";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-term-border">
      <ParallaxField />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-28 pt-20 text-center md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 rounded-full border border-term-green/30 bg-term-green/5 px-3 py-1 text-[11px] uppercase tracking-widest text-term-green"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-term-green opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-term-green" />
          </span>
          {isDeployed ? "Live on Flare Coston2" : "Demo mode — not yet deployed"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-balance text-5xl font-semibold tracking-tight text-gray-50 md:text-7xl"
        >
          Confidential XRP treasury,
          <br />
          <span className="bg-gradient-to-r from-term-green via-emerald-300 to-term-amber bg-clip-text text-transparent">
            settled in silence.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-2xl text-balance text-base text-term-muted md:text-lg"
        >
          SILENT shields FXRP behind a commitment hash, evaluates your private treasury
          policy inside a TEE against the live FTSO price, and settles with a
          cryptographic attestation — no balance, trigger, or payroll ever touches the
          public chain.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <a
            href="#app"
            className="group flex items-center gap-2 rounded border border-term-green/60 bg-term-green/10 px-5 py-2.5 text-sm font-medium text-term-green transition hover:bg-term-green/20"
          >
            Launch App
            <IconArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
          <div className="rounded border border-term-border bg-term-panel/60 px-1 py-1">
            <ConnectButton />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid w-full max-w-3xl grid-cols-2 gap-3 pt-10 text-left md:grid-cols-4"
        >
          {[
            ["Asset", "FXRP / XRP"],
            ["Network", "Flare Coston2"],
            ["Policies", "Stop-Loss · Payroll"],
            ["Trust root", "TEE attestation"],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-term-border bg-term-panel/50 px-3 py-2.5 backdrop-blur">
              <div className="text-[10px] uppercase tracking-wide text-term-muted">{label}</div>
              <div className="mt-0.5 text-sm text-gray-200">{value}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
