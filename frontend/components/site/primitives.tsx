import type { ReactNode } from "react";

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-6 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-term-violet ${className}`}
    >
      <span className="h-px w-5 bg-term-violet/40" />
      {children}
    </div>
  );
}
