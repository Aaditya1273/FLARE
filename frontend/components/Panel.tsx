export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-term-border bg-term-panel/70 p-5 backdrop-blur transition hover:border-term-green/30">
      <h2 className="text-xs uppercase tracking-widest text-term-muted">{title}</h2>
      {children}
    </div>
  );
}

export function Banner({ tone, children }: { tone: "green" | "amber" | "muted"; children: React.ReactNode }) {
  const colors = {
    green: "border-term-green/40 text-term-green bg-term-green/5",
    amber: "border-term-amber/40 text-term-amber bg-term-amber/5",
    muted: "border-term-border text-term-muted bg-black/20",
  }[tone];
  return <div className={`rounded border px-3 py-2 text-xs leading-relaxed ${colors}`}>{children}</div>;
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
  "rounded-md border border-term-border bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-term-green";

export const buttonClass =
  "rounded-md border border-term-green/60 bg-term-green/10 px-3 py-2 text-sm font-medium text-term-green transition hover:bg-term-green/20 hover:shadow-[0_0_20px_-4px_rgba(34,197,94,0.4)] disabled:cursor-not-allowed disabled:border-term-border disabled:bg-transparent disabled:text-term-muted disabled:shadow-none";
