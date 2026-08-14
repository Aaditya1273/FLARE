"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { IntelligenceGlow } from "./IntelligenceGlow";
import { isDeployed } from "@/lib/flare";

const PRIMITIVES = ["FAssets", "FTSOv2", "FCC", "FDC", "Coston2", "Foundry", "Go TEE"];

export function Hero() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <section className="relative overflow-hidden bg-term-bg">
      <IntelligenceGlow className="left-1/2 top-[-320px] h-[640px] w-[640px] -translate-x-1/2" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-24 pt-36 text-center md:pt-48">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-gradient text-sm font-semibold uppercase tracking-[0.2em]"
        >
          SILENT 2.0 — Confidential Treasury OS
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-term-text sm:text-6xl md:text-7xl"
        >
          Your treasury.
          <br />
          Fully private.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-balance text-lg text-term-muted md:text-xl"
        >
          SILENT shields FXRP behind a commitment hash and settles every policy inside a
          TEE — proven on-chain, never revealed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="flex flex-col items-center gap-4 pt-4"
        >
          {isConnected ? (
            <button
              onClick={() => router.push("/app")}
              className="rounded-full bg-term-invertBg px-7 py-3 text-[15px] font-medium text-term-invertText transition hover:opacity-90"
            >
              Enter Dashboard
            </button>
          ) : (
            <div className="[&_button]:!rounded-full">
              <ConnectButton label="Get Started" accountStatus="address" />
            </div>
          )}
          <span className="text-[13px] text-term-muted">
            {isDeployed ? "Live on Flare Coston2" : "Demo mode — not yet deployed"}
          </span>
        </motion.div>
      </div>

      {/* marquee of the stack this actually runs on — not stock-art logos */}
      <div className="relative overflow-hidden border-t border-term-border py-5">
        <motion.div
          className="flex w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, ease: "linear", repeat: Infinity }}
        >
          {[...PRIMITIVES, ...PRIMITIVES, ...PRIMITIVES, ...PRIMITIVES].map((p, i) => (
            <span key={i} className="whitespace-nowrap px-8 text-[13px] font-medium tracking-wide text-term-muted/70">
              {p}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
