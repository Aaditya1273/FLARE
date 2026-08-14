"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { IntelligenceGlow } from "@/components/IntelligenceGlow";
import { isDeployed } from "@/lib/flare";

const SOURCES = ["FAssets", "FTSOv2", "FCC", "FDC", "Coston2", "Foundry", "Go TEE", "commitment-only"];

// Any public MP4 works — swap via NEXT_PUBLIC_HERO_VIDEO_URL. If the URL fails
// to load (or is unset), the glow layer below carries the hero and the card
// simply shows the dark overlay instead of a broken player.
const HERO_VIDEO =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ||
  "https://assets.mixkit.co/videos/31590/31590-720.mp4";

// Desktop splits the title left↔right to flank the shrunken card. Tablet/mobile
// don't have the horizontal room, so both halves lift UP and stack as a
// two-line title above the card. Viewport height is tracked so the lift scales
// with the screen (clears the card at any size).
function useViewport() {
  const [vp, setVp] = useState({ isDesktop: true, h: 900 });
  useEffect(() => {
    const update = () =>
      setVp({
        isDesktop: window.matchMedia("(min-width: 1024px)").matches,
        h: window.innerHeight,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return vp;
}

export default function HeroMorph() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { isDesktop, h: vh } = useViewport();
  const [videoFailed, setVideoFailed] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Section is 205vh → the sticky child is pinned for ~105vh.
  // The morph runs over [0, M] and COMPLETES well before the pin releases.
  const M = 0.33;
  const width = useTransform(scrollYProgress, [0, M], ["100vw", isDesktop ? "24vw" : "70vw"]);
  const height = useTransform(scrollYProgress, [0, M], ["100vh", isDesktop ? "42vh" : "30vh"]);
  const radius = useTransform(scrollYProgress, [0, M], ["0px", "26px"]);
  const cardShadow = useTransform(
    scrollYProgress,
    [M * 0.6, M],
    ["0 0 0 rgba(0,0,0,0)", "0 50px 110px -36px rgba(11,11,12,0.5)"]
  );
  const dark = useTransform(scrollYProgress, [0, M * 0.9], [0.72, 0.22]);

  const leftX = useTransform(scrollYProgress, [0, M], [0, -230]);
  const rightX = useTransform(scrollYProgress, [0, M], [0, 230]);
  const titleY = useTransform(scrollYProgress, [0, M], [0, -(vh * 0.26)]);
  const titleScale = useTransform(scrollYProgress, [0, M], [isDesktop ? 1.24 : 1.04, 1]);

  // The title starts WHITE over the dark video and must end in the theme text
  // color over the page background. Rather than interpolating colors (framer
  // can't tween a CSS var), stack two copies of each half and cross-fade them.
  const whiteFade = useTransform(scrollYProgress, [M * 0.55, M * 0.8], [1, 0]);
  const inkFade = useTransform(scrollYProgress, [M * 0.55, M * 0.8], [0, 1]);
  const titleShadow = useTransform(
    scrollYProgress,
    [0, M * 0.7],
    ["0 2px 30px rgba(0,0,0,0.6)", "0 2px 30px rgba(0,0,0,0)"]
  );

  const subOpacity = useTransform(scrollYProgress, [M * 0.85, M], [0, 1]);
  const chromeOpacity = useTransform(scrollYProgress, [0, M * 0.25], [1, 0]);

  return (
    <section ref={ref} className="relative h-[205vh]">
      <div className="sticky top-0 grid h-screen place-items-center overflow-hidden bg-term-bg">
        {/* glow fallback layer — always behind the video */}
        <div className="absolute inset-0">
          <IntelligenceGlow className="left-1/2 top-[-320px] h-[640px] w-[640px] -translate-x-1/2" />
        </div>

        {/* morphing video card */}
        <motion.div
          style={{ width, height, borderRadius: radius, boxShadow: cardShadow }}
          className="relative z-10 overflow-hidden bg-ink"
        >
          {!videoFailed && (
            <video
              className="absolute inset-0 h-full w-full object-cover [filter:saturate(0.7)_brightness(0.8)]"
              src={HERO_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onError={() => setVideoFailed(true)}
            />
          )}
          <motion.div style={{ opacity: dark }} className="absolute inset-0 bg-ink" />
        </motion.div>

        {/* split title — white copy (over the video) cross-fades to ink copy */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          {isDesktop ? (
            <div className="relative mx-auto flex w-full max-w-5xl items-center justify-center px-5">
              <motion.h1
                style={{ x: leftX, scale: titleScale, textShadow: titleShadow, opacity: whiteFade }}
                className="absolute right-1/2 origin-right whitespace-nowrap pr-[0.14em] text-right text-4xl font-semibold tracking-tight text-white lg:text-[54px]"
              >
                Your treasury.
              </motion.h1>
              <motion.h1
                style={{ x: rightX, scale: titleScale, textShadow: titleShadow, opacity: whiteFade }}
                className="absolute left-1/2 origin-left whitespace-nowrap pl-[0.14em] text-left text-4xl font-semibold tracking-tight text-white lg:text-[54px]"
              >
                Fully private.
              </motion.h1>
              <motion.h1
                style={{ x: leftX, scale: titleScale, opacity: inkFade }}
                className="absolute right-1/2 origin-right whitespace-nowrap pr-[0.14em] text-right text-4xl font-semibold tracking-tight text-term-text lg:text-[54px]"
              >
                Your treasury.
              </motion.h1>
              <motion.h1
                style={{ x: rightX, scale: titleScale, opacity: inkFade }}
                className="absolute left-1/2 origin-left whitespace-nowrap pl-[0.14em] text-left text-4xl font-semibold tracking-tight text-term-text lg:text-[54px]"
              >
                Fully private.
              </motion.h1>
            </div>
          ) : (
            <motion.div style={{ y: titleY }} className="flex flex-col items-center gap-1 px-5 text-center">
              <motion.h1
                style={{ scale: titleScale, textShadow: titleShadow, opacity: whiteFade }}
                className="whitespace-nowrap font-semibold leading-[1.04] tracking-tight text-white text-[clamp(1.9rem,9vw,3.25rem)]"
              >
                Your treasury.
              </motion.h1>
              <motion.h1
                style={{ scale: titleScale, textShadow: titleShadow, opacity: whiteFade }}
                className="whitespace-nowrap font-semibold leading-[1.04] tracking-tight text-white text-[clamp(1.9rem,9vw,3.25rem)]"
              >
                Fully private.
              </motion.h1>
              <motion.h1
                style={{ scale: titleScale, opacity: inkFade }}
                className="whitespace-nowrap font-semibold leading-[1.04] tracking-tight text-term-text text-[clamp(1.9rem,9vw,3.25rem)]"
              >
                Your treasury.
              </motion.h1>
              <motion.h1
                style={{ scale: titleScale, opacity: inkFade }}
                className="whitespace-nowrap font-semibold leading-[1.04] tracking-tight text-term-text text-[clamp(1.9rem,9vw,3.25rem)]"
              >
                Fully private.
              </motion.h1>
            </motion.div>
          )}
        </div>

        {/* subcopy (appears below the card) */}
        <motion.p
          style={{ opacity: subOpacity }}
          className="absolute bottom-[16vh] left-1/2 z-20 w-full max-w-lg -translate-x-1/2 px-6 text-center text-[15px] leading-relaxed text-term-text/85 sm:bottom-[9vh] sm:max-w-xl sm:text-lg"
        >
          SILENT shields FXRP behind a commitment hash and settles every policy
          inside a TEE — proven on-chain, never revealed.
        </motion.p>

        {/* scroll hint + CTA + stack marquee (before scroll) */}
        <motion.div
          style={{ opacity: chromeOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        >
          <div className="mb-6 flex flex-col items-center gap-3">
            <p className="text-gradient text-[13px] font-semibold uppercase tracking-[0.2em]">
              SILENT 2.0 — Confidential Treasury OS
            </p>
            {isConnected ? (
              <button
                onClick={() => router.push("/app")}
                className="pointer-events-auto rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black transition hover:opacity-90"
              >
                Enter Dashboard
              </button>
            ) : (
              <div className="pointer-events-auto [&_button]:!rounded-full">
                <ConnectButton label="Get Started" accountStatus="address" />
              </div>
            )}
            <span className="text-[13px] text-white/80">
              {isDeployed ? "Live on Flare Coston2" : "Demo mode — not yet deployed"}
            </span>
          </div>
          <div className="mb-4 text-center text-[12px] uppercase tracking-[0.18em] text-white/80">
            Scroll to explore ↓
          </div>
          <div className="overflow-hidden border-t border-white/15 py-4 sm:py-5">
            <div className="mb-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/50">
              The stack it runs on
            </div>
            {/* seamless left-scrolling marquee: 4 copies, translate by -50% (= 2 copies) */}
            <motion.div
              className="flex w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 26, ease: "linear", repeat: Infinity }}
            >
              {[...SOURCES, ...SOURCES, ...SOURCES, ...SOURCES].map((p, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap px-5 font-mono text-[12px] font-medium text-white/70 sm:px-8 sm:text-[13px]"
                >
                  {p}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
