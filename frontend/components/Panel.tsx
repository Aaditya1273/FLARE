export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-term-border bg-term-panel/70 p-6 shadow-xl shadow-black/10 backdrop-blur transition hover:border-violet-400/30">
      <h2 className="text-xs font-medium uppercase tracking-widest text-term-muted">{title}</h2>
      {children}
    </div>
  );
}

export function Banner({ tone, children }: { tone: "green" | "amber" | "muted"; children: React.ReactNode }) {
  const colors = {
    green: "border-term-green/40 text-term-green bg-term-green/5",
    amber: "border-term-amber/40 text-term-amber bg-term-amber/5",
    muted: "border-term-border text-term-muted bg-term-surface/[0.06]",
  }[tone];
  return <div className={`rounded-xl border px-3 py-2 text-xs leading-relaxed break-all ${colors}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-term-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-xl border border-term-border bg-term-surface/[0.08] px-3 py-2.5 text-sm text-term-text outline-none transition focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30";

export const buttonClass =
  "rounded-xl border border-term-border/20 bg-term-invertBg px-4 py-2.5 text-sm font-semibold text-term-invertText transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-term-surface/[0.05] disabled:text-term-muted disabled:border-transparent";
