"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayers, IconShield, IconLock, IconCheckShield } from "./icons";

// Simple inline icons for Dashboard and History (no external dep needed)
function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 15.5" />
    </svg>
  );
}

const NAV = [
  { href: "/app",             label: "Overview",       icon: IconLayers,     exact: true },
  { href: "/app/shield",      label: "Shield",         icon: IconShield },
  { href: "/app/policy",      label: "Private Policy", icon: IconLock },
  { href: "/app/prove",       label: "Prove & Settle",  icon: IconCheckShield },
  { href: "/app/dashboard",   label: "Dashboard",      icon: IconGrid },
  { href: "/app/history",     label: "History",        icon: IconClock },

];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-term-border bg-term-panel/60 px-4 py-6 backdrop-blur md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
        <span className="h-2 w-2 rounded-full bg-brand" />
        <span className="text-gradient">SILENT</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active
                  ? "bg-term-surface/[0.08] text-term-text shadow-inner shadow-violet-500/10"
                  : "text-term-muted hover:bg-term-surface/[0.04] hover:text-term-text"
                }`}
            >
              <item.icon className={`h-4 w-4 ${active ? "text-violet-300" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-term-border bg-term-surface/[0.04] px-3 py-3 text-[11px] leading-relaxed text-term-muted">
        Confidential XRPFi Operating System  settlement authorized by TEE attestation, never a
        plaintext balance.
      </div>
    </aside>
  );
}
