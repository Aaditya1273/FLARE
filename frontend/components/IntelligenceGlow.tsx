// Apple Intelligence's signature visual: a soft, slowly rotating iridescent glow.
// Pure CSS conic-gradient + Tailwind animation - no image assets, no extra dependency.
export function IntelligenceGlow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-glow-spin motion-reduce:animate-none pointer-events-none absolute rounded-full bg-intelligence-conic opacity-40 blur-[90px] ${className}`}
    />
  );
}
