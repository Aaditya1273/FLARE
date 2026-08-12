"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-term-muted">
        Redirecting to connect your wallet...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
