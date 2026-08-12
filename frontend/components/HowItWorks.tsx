import { IconShield, IconLock, IconCheckShield } from "./icons";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    icon: IconShield,
    title: "Shield",
    body: "FXRP moves into SilentVault behind a commitment hash. The amount is never stored or emitted on-chain — only the commitment exists in public state.",
  },
  {
    icon: IconLock,
    title: "Set a private policy",
    body: "A stop-loss trigger or payroll batch is encrypted client-side and evaluated only inside the TEE, against the live FTSO XRP/USD feed.",
  },
  {
    icon: IconCheckShield,
    title: "Prove & settle",
    body: "The TEE signs a settlement or a reserves-above-threshold attestation. SilentVault verifies it on-chain and releases funds.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-term-bg py-28 md:py-36">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-term-text md:text-5xl">
            Three steps.
            <br />
            Nothing sensitive leaves the enclave.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-4 rounded-3xl bg-term-surface/[0.05] p-8">
                <step.icon className="h-7 w-7 text-term-text" />
                <h3 className="text-lg font-medium text-term-text">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-term-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
