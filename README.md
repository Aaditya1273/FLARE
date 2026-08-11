# SILENT — Confidential XRPFi Operating System

**The first private institutional treasury and settlement rail for XRP on Flare.**

XRP is a $150B asset, but every FXRP position, redemption, and payroll flow on Flare
is public — balances, liquidation prices, and treasury moves leak straight to MEV and
front-runners. That's a big reason FXRP TVL has stuck around $170M–$236M despite a
2.2B FLR incentive program. Institutions won't bring treasury on-chain if their book
is public.

SILENT shields FXRP into a TEE-governed vault. Only a commitment hash goes on-chain.
The treasury's policy (a stop-loss trigger, a payroll batch) is encrypted and only
ever evaluated inside a TEE against the live FTSO price. Settlement is authorized by
a TEE-signed attestation, verified on-chain — the vault never needs to know the
policy, and the chain never sees the balance.

## Architecture

```
                     ┌─────────────────────────┐
   user wallet  ───► │   SilentVault.sol        │  commitment-only storage
   (RainbowKit) │    │   SilentPolicyRegistry   │  encrypted policy + hash
                │    └───────────┬──────────────┘
                │                │ resolves via FlareContractRegistry
                │                ▼
                │    ┌─────────────────────────┐
                │    │  FtsoV2 / AssetManagerFXRP │  (live Flare state)
                │    └─────────────────────────┘
                │
                └──► TEE Extension (FastAPI, SIMULATED_TEE)
                       /api/shield    → commitment = keccak256(amount+salt+user)
                       /api/evaluate  → decrypt policy, check FTSO price, decide
                       /api/settle    → simulated PMW-signed settlement + attestation
                       /api/attest/*  → TEE ID, code hash, signed proof-of-reserves
```

## How Flare is used

- **FAssets (FXRP)**: SilentVault holds and transfers real FXRP; `assetManager()`
  resolves the live `AssetManagerFXRP` via `FlareContractRegistry` rather than a
  hardcoded address.
- **FTSOv2**: `ftsoV2()` resolves the live price feed contract the same way; the TEE's
  stop-loss policy evaluates against the XRP/USD feed before authorizing a settlement.
- **FCC (Flare Confidential Compute)**: the entire private-policy flow is impossible
  without a TEE — `requestSettlement` emits an `InstructionSent` event that a
  production FCC deployment consumes directly; this build's TEE extension implements
  the same interface in `SIMULATED_TEE` mode (see `tee-extension/pmw_signer.py`),
  clearly labeled, with the on-chain verification path unchanged from production.
- **PMW (Protocol Managed Wallet)**: settlement and proof-of-reserves are authorized
  by a TEE-signed attestation the contract verifies against a configured
  `teeSigner` — the exact shape PMW's k-of-n signer would produce; today it's one
  simulated key, tomorrow it's Flare's attested hardware.

## Deployed addresses (Coston2, chainId 114)

| Contract | Address |
|---|---|
| SilentVault | `0xc205580a3e6339F643C1A4A1B5d95B5bF595BFc9` |
| SilentPolicyRegistry | `0x2B1D9DD3cD77cF7f1A198E03127EC1B0D59Ad9dB` |
| FlareContractRegistry (Flare-provided) | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` |
| FXRP (Coston2 reference) | `0x0b6A3645c240605887a5532109323A3E12273dc7` |

Live on [Coston2 Explorer](https://coston2-explorer.flare.network/address/0xc205580a3e6339F643C1A4A1B5d95B5bF595BFc9).
Songbird/Mainnet: deploy scripts are ready (`deploy-songbird.ts`), not yet run.

## How to run

**Contracts**
```
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy-coston2.ts --network coston2   # needs PRIVATE_KEY in .env.local
```

**TEE Extension**
```
cd tee-extension
docker build -t silent-tee .
docker run -p 8000:8000 silent-tee
# or locally: pip install -r requirements.txt && uvicorn app:app --reload
```

**Frontend**
```
cd frontend
npm install
npm run dev
```
Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `frontend/.env.local` (from
cloud.walletconnect.com) for the WalletConnect QR modal — MetaMask (injected) works
without it.

## Judging criteria mapping

1. **Product usefulness** — solves the exact reason FXRP TVL is stuck: institutions
   won't bring treasury on-chain while it's public. SILENT is what makes the 2.2B FLR
   incentive program actually work for real treasuries, not mercenary farmers.
2. **Flare integration quality** — full stack, not a fork: FAssets custody, FTSOv2
   pricing, FCC-pattern TEE evaluation, PMW-shaped settlement attestation, all wired
   through `FlareContractRegistry` instead of hardcoded addresses.
3. **Technical execution** — deployed and verified live on Coston2 (see addresses
   above), Hardhat test suite green, TEE extension smoke-tested end-to-end against the
   live contract (a TEE-signed `proveReserves` attestation recovers on-chain to the
   configured `teeSigner`).
4. **Evidence of new work** — everything in `contracts/`, `tee-extension/`,
   `frontend/`, and the deploy/verify scripts was built for this submission; nothing
   pre-existed (this repo was a clean slate).
5. **Clarity** — this README, `SUBMISSION.md`, and `DEMO_SCRIPT.md` map the product,
   the Flare integration, and the pitch for judges and follow-on funders.

## Why this beats 544 other BUIDLs

Most Summer Signal entries pick one bounty: a sealed-bid auction, a private
prediction market, a firewall, a redemption layer. SILENT is the only entry that
chains FAssets custody, FTSO pricing, FCC-style TEE evaluation, and PMW-shaped
settlement into one product — because removing any one of those breaks it. It's not
a demo of a primitive; it's the treasury rail an XRP holder with $10M+ actually needs
before they'll put it on-chain.

## Roadmap

- **Week 1**: Uphold tag-mint integration for 1-tx FXRP onboarding; Firelight stXRP
  as a yield-bearing shield target.
- **Month 1**: security audit, pilot with 2 XRP treasuries.
- **Q4**: Flare mainnet deployment, FBTC support.

## Video

_placeholder — demo video link goes here_
