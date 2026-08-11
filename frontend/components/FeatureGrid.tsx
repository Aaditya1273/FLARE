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
    body: "Private policy evaluation is impossible without confidential compute. This build runs SIMULATED_TEE with a documented migration path to Flare's real hardware.",
  },
  {
    icon: IconCheckShield,
    title: "PMW-shaped settlement",
    body: "Every settlement and reserves proof is authorized by a signed attestation verified on-chain — the same shape a Protocol Managed Wallet k-of-n signer would produce.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-b border-term-border py-20">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <h2 className="text-xs uppercase tracking-widest text-term-muted">Built on Flare</h2>
          <p className="mt-2 max-w-xl text-2xl font-semibold text-gray-100">
            Every primitive is load-bearing — remove one and the product breaks.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="group flex h-full gap-4 rounded border border-term-border bg-term-panel/50 p-5 transition hover:border-term-green/40 hover:bg-term-panel">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-term-border text-term-muted transition group-hover:border-term-green/40 group-hover:text-term-green">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-term-muted">{f.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
