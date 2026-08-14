"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

// The landing page carries a theme toggle inside its fixed SiteNav, so the
// standalone floating toggle would collide with the nav's right edge on mobile.
// It still floats on the /app pages, which have no nav of their own here.
export function ThemeToggleSlot() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <ThemeToggle />;
}
