import { IconShield, IconLock, IconCheckShield } from "./icons";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    icon: IconShield,
    title: "1. Shield",
    body: "FXRP moves into SilentVault behind a commitment hash. The amount is never stored or emitted on-chain — only the commitment exists in public state.",
  },
  {
    icon: IconLock,
    title: "2. Set private policy",
    body: "A stop-loss trigger or payroll batch is encrypted client-side and evaluated only inside the TEE, against the live FTSO XRP/USD feed. The plaintext never reaches the chain.",
  },
  {
    icon: IconCheckShield,
    title: "3. Prove & settle",
    body: "The TEE signs a settlement or a reserves-above-threshold attestation. SilentVault verifies the signature on-chain and releases funds — solvency proven, balance never revealed.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-term-border bg-term-bg py-20">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <h2 className="text-xs uppercase tracking-widest text-term-muted">How it works</h2>
          <p className="mt-2 max-w-xl text-2xl font-semibold text-gray-100">
            Three steps. Nothing sensitive ever leaves the enclave.
          </p>
        </Reveal>

        <div className="relative mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-term-border to-transparent md:block" />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12}>
              <div className="relative flex h-full flex-col gap-3 rounded border border-term-border bg-term-panel/60 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded border border-term-green/30 bg-term-green/10 text-term-green">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-100">{step.title}</h3>
                <p className="text-sm leading-relaxed text-term-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
