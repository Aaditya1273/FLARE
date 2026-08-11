import { getFlareContract, explorerAddressUrl, isDeployed } from "@/lib/flare";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-10 text-[11px] text-term-muted">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-term-border pt-6">
        <span>SILENT — Confidential XRPFi Operating System</span>
        <span>
          Network: Flare Testnet Coston2 (chainId 114){" "}
          {!isDeployed && <span className="text-term-amber">— contracts not configured</span>}
        </span>
      </div>
      {isDeployed && (
        <span>
          SilentVault:{" "}
          <a className="underline" href={explorerAddressUrl(getFlareContract("silentVault"))} target="_blank" rel="noreferrer">
            {getFlareContract("silentVault")}
          </a>
        </span>
      )}
    </footer>
  );
}
