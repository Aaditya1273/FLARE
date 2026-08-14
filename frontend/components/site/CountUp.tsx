"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";

/// Animates from 0 to `to` once it scrolls into view. No new dependency -
/// framer-motion's own animate() drives the number, same lib already used
/// for Reveal elsewhere on this page.
export function CountUp({
  to,
  duration = 1.6,
  format = (v: number) => Math.round(v).toLocaleString(),
}: {
  to: number;
  duration?: number;
  format?: (v: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration, format]);

  return <span ref={ref}>{display}</span>;
}
