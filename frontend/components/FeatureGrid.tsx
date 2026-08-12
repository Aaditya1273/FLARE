import { IconLayers, IconPulse, IconLock, IconCheckShield } from "./icons";
import { Reveal } from "./Reveal";

const FEATURES = [
  {
    icon: IconLayers,
    title: "FAssets custody",
    body: "SilentVault holds real FXRP and resolves the live AssetManagerFXRP through FlareContractRegistry — never a hardcoded address.",
  },
  {
    icon: IconPulse,
    title: "FTSOv2 pricing",
    body: "Stop-loss policies check the live XRP/USD feed inside the TEE before a settlement is ever signed.",
  },
  {
    icon: IconLock,
    title: "FCC-pattern TEE",
    body: "Private policy evaluation is impossible without confidential compute. SIMULATED_TEE today, real hardware tomorrow.",
  },
  {
    icon: IconCheckShield,
    title: "PMW-shaped settlement",
    body: "Every settlement is authorized by a signed attestation verified on-chain — the shape a real k-of-n signer produces.",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-term-bg py-28 md:py-36">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-term-text md:text-5xl">
            Built on Flare.
            <br />
            Every primitive is load-bearing.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="flex h-full gap-5 rounded-3xl bg-term-surface/[0.05] p-8">
                <f.icon className="h-6 w-6 shrink-0 text-term-text" />
                <div>
                  <h3 className="text-base font-medium text-term-text">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-term-muted">{f.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
