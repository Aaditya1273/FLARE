export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded border border-term-border bg-term-panel p-5">
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
  "rounded border border-term-border bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-term-green";

export const buttonClass =
  "rounded border border-term-green/60 bg-term-green/10 px-3 py-2 text-sm font-medium text-term-green transition hover:bg-term-green/20 disabled:cursor-not-allowed disabled:border-term-border disabled:bg-transparent disabled:text-term-muted";
