"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// Scroll-driven parallax gradient field for the landing hero: three soft blurred
// orbs drifting at different speeds as the page scrolls, plus a faint grid overlay,
// all pure CSS/SVG - no image assets to fetch or ship.
export function ParallaxField() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const yGreen = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const yAmber = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const yBlue = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <motion.div
        style={{ y: yGreen, opacity: fade }}
        className="absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-term-green/25 blur-[110px]"
      />
      <motion.div
        style={{ y: yAmber, opacity: fade }}
        className="absolute right-[-10%] top-40 h-[380px] w-[380px] rounded-full bg-term-amber/20 blur-[110px]"
      />
      <motion.div
        style={{ y: yBlue, opacity: fade }}
        className="absolute left-1/3 top-96 h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-[110px]"
      />
    </div>
  );
}
