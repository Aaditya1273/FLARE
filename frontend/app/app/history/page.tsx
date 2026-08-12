"use client";

import { HistoryCard } from "@/components/HistoryCard";

export default function HistoryPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-base font-semibold text-term-text">Activity History</h1>
        <p className="text-xs text-term-muted mt-0.5">
          All shield events for your wallet — fetched live from the SilentVault contract on Coston2.
        </p>
      </div>
      <HistoryCard />
    </div>
  );
}
