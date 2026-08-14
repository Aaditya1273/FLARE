"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useTheme } from "@/lib/theme";
import { IconSun, IconMoon } from "@/components/icons";

// Every href targets a real section on the landing page — keep in sync with
// app/page.tsx section ids (#how, #stack, #proof, #faq).
const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Flare stack", href: "#stack" },
  { label: "Proof", href: "#proof" },
  { label: "FAQ", href: "#faq" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const { isConnected } = useAccount();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
      <nav
        className={`flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-all duration-300 sm:px-6 sm:py-4 ${
          scrolled
            ? "border-term-border bg-term-panel/90 shadow-xl shadow-black/20 backdrop-blur-md"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2 pl-1">
          <span className="h-2 w-2 rounded-full bg-term-violet" />
          <span className="text-[18px] font-semibold tracking-tight text-term-text">SILENT</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] text-term-muted transition-colors hover:text-term-text">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-term-border text-term-muted transition-colors hover:text-term-text sm:flex"
          >
            {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => router.push("/app")}
            className="inline-flex min-w-[120px] items-center justify-center whitespace-nowrap rounded-lg bg-term-invertBg px-4 py-2.5 text-[14px] font-medium text-term-invertText transition-transform hover:-translate-y-0.5"
          >
            {isConnected ? "Enter App" : "Launch App"}
          </button>
        </div>
      </nav>
    </header>
  );
}
