"use client";

import { IntelligenceGlow } from "@/components/IntelligenceGlow";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { IconLayers, IconPulse, IconLock, IconCheckShield } from "@/components/icons";

const STACK = ["Solidity · Foundry", "Go (enclave)", "ECIES", "viem · wagmi", "Next.js", "Node.js keeper"];

const FEATURES = [
  {
    icon: IconLayers,
    title: "FAssets custody",
    body: "SilentVault holds real FXRP and resolves the live AssetManagerFXRP through FlareContractRegistry — never a hardcoded address.",
  },
  {
    icon: IconPulse,
    title: "FTSOv2 pricing",
    body: "Stop-loss policies check the live XRP/USD feed inside the TEE before a settlement is ever signed.",
  },
  {
    icon: IconLock,
    title: "FCC-pattern TEE",
    body: "Private policy evaluation is impossible without confidential compute. SIMULATED_TEE today, real hardware tomorrow.",
  },
  {
    icon: IconCheckShield,
    title: "PMW-shaped settlement",
    body: "Every settlement is authorized by a signed attestation verified on-chain — the shape a real k-of-n signer produces.",
  },
];

export default function TechSection() {
  return (
    <section
      id="stack"
      className="relative isolate overflow-hidden bg-black py-28 sm:py-36"
    >
      <IntelligenceGlow className="bottom-[-240px] left-[-240px] h-[560px] w-[560px]" />

      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-term-violet">
            <span className="h-px w-5 bg-term-violet/50" />
            Built on Flare
          </div>
          <h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Built on Flare.
            <br />
            Every primitive is load-bearing.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">
            Four Flare primitives chained into one flow — none of it works
            without the others, and none of the addresses are hardcoded.
          </p>
        </Reveal>

        <Stagger className="mt-14 grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <StaggerItem
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <div className="flex gap-4">
                <f.icon className="h-6 w-6 shrink-0 text-white" />
                <div>
                  <h3 className="text-base font-medium text-white">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-white/10 pt-8">
            <span className="text-[12px] uppercase tracking-[0.14em] text-white/40">
              Built with
            </span>
            {STACK.map((s) => (
              <span key={s} className="font-mono text-[14px] text-white/55">
                {s}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
