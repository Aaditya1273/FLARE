"use client";

import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Section } from "./primitives";
import { Reveal } from "@/components/Reveal";
import { IntelligenceGlow } from "@/components/IntelligenceGlow";
import { isDeployed } from "@/lib/flare";

export default function AccessSection() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <Section id="access" className="py-24 sm:py-32">
      <Reveal>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-term-border px-6 py-14 text-center shadow-xl shadow-black/10 sm:px-12 sm:py-20">
          {/* glow backdrop on black, like the hero */}
          <div className="absolute inset-0 -z-10 bg-black" />
          <IntelligenceGlow className="left-1/2 top-[-260px] h-[520px] w-[520px] -translate-x-1/2" />

          <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-term-violet">
            <span className="h-px w-5 bg-term-violet/50" />
            For institutions
          </div>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Shield your treasury. Prove on chain.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
            Hedge, pay, and redeem without revealing intent — commitment-only
            vaults, policies evaluated in the TEE, settlement attested on Flare.
          </p>

          <div className="mt-9 flex items-center justify-center">
            {isConnected ? (
              <button
                onClick={() => router.push("/app")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-medium text-black transition-all duration-200 hover:-translate-y-0.5"
              >
                Enter Dashboard →
              </button>
            ) : (
              <div className="[&_button]:!rounded-lg">
                <ConnectButton label="Get Started" accountStatus="address" />
              </div>
            )}
          </div>
          <p className="mt-5 font-mono text-[12px] text-white/45">
            {isDeployed
              ? "Live on Flare Coston2 · attestation signer allowlisted on-chain"
              : "Demo mode — contracts not yet configured"}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
