"use client";

import { DashboardCard } from "@/components/DashboardCard";
import { isDeployed } from "@/lib/flare";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-base font-semibold text-term-text">Dashboard</h1>
        <p className="text-xs text-term-muted mt-0.5">
          {isDeployed
            ? "Live vault stats — data fetched directly from Coston2 and the FTSO price feed."
            : "Contracts not yet deployed — showing demo data."}
        </p>
      </div>
      <DashboardCard />
    </div>
  );
}
