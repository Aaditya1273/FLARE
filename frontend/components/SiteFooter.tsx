import { getFlareContract, explorerAddressUrl, isDeployed } from "@/lib/flare";

export function SiteFooter() {
  const vault = getFlareContract("silentVault");
  const fxrp = getFlareContract("fxrp");

  return (
    <footer className="mx-auto flex max-w-5xl flex-col bg-term-bg px-6 pb-10 pt-10 text-[11px] text-term-muted">
      <div className="grid gap-8 border-t border-term-border pt-8 sm:grid-cols-3">
        {/* brand */}
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-term-text">SILENT</div>
          <p className="mt-2 max-w-xs text-[12px] leading-relaxed">
            Confidential XRPFi Operating System — commitment-only vaults,
            TEE-evaluated policies, attested settlement on Flare.
          </p>
        </div>

        {/* contracts */}
        <div>
          <div className="text-[12px] uppercase tracking-[0.12em] text-term-muted">
            Contracts
          </div>
          <ul className="mt-2 space-y-1.5">
            <li>
              {isDeployed ? (
                <a
                  className="underline"
                  href={explorerAddressUrl(vault)}
                  target="_blank"
                  rel="noreferrer"
                >
                  SilentVault2 · {vault.slice(0, 8)}…{vault.slice(-6)} ↗
                </a>
              ) : (
                "SilentVault2 — not configured"
              )}
            </li>
            <li>
              {isDeployed ? (
                <a
                  className="underline"
                  href={explorerAddressUrl(fxrp)}
                  target="_blank"
                  rel="noreferrer"
                >
                  FXRP · {fxrp.slice(0, 8)}…{fxrp.slice(-6)} ↗
                </a>
              ) : (
                "FXRP — not configured"
              )}
            </li>
          </ul>
        </div>

        {/* network */}
        <div>
          <div className="text-[12px] uppercase tracking-[0.12em] text-term-muted">
            Network
          </div>
          <ul className="mt-2 space-y-1.5">
            <li>Flare Testnet Coston2 (chainId 114)</li>
            {isDeployed ? (
              <li>attestation signer allowlisted on-chain</li>
            ) : (
              <li className="text-term-amber">— contracts not configured</li>
            )}
          </ul>
        </div>
      </div>

      {/* giant ghost wordmark */}
      <div className="overflow-hidden pt-6">
        <div className="select-none whitespace-nowrap text-center text-[16vw] font-semibold leading-[0.8] tracking-tight text-term-text/[0.07]">
          SILENT
        </div>
      </div>
    </footer>
  );
}
