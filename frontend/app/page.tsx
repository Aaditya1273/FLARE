"use client";

import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FeatureGrid } from "@/components/FeatureGrid";
import { ShieldCard } from "@/components/ShieldCard";
import { PrivatePolicyCard } from "@/components/PrivatePolicyCard";
import { ProveCard } from "@/components/ProveCard";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HowItWorks />
      <FeatureGrid />

      <section id="app" className="scroll-mt-10 border-b border-term-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <h2 className="text-xs uppercase tracking-widest text-term-muted">Launch the app</h2>
            <p className="mt-2 max-w-xl text-2xl font-semibold text-gray-100">
              Shield, set a private policy, prove reserves.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ShieldCard />
              <PrivatePolicyCard />
              <ProveCard />
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
