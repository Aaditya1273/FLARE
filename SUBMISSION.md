# SUBMISSION — Flare Summer Signal

**Project name:** SILENT — Confidential XRPFi OS

**Selected bounty:** BOTH Bounty 1 (Interoperable Asset Products) + Bounty 2
(Confidential Compute Apps)

**Short description:**
SILENT shields FXRP treasury into a TEE-governed vault where only a commitment hash
is public. Private policies (stop-loss, payroll) are evaluated inside a TEE against
live FTSO prices and settled via a PMW-shaped signed attestation.

**Target user:** CFOs and DAO treasuries holding $1M+ in XRP who need on-chain yield
and automation without exposing balances, liquidation levels, or payroll to MEV and
competitors.

**Demo link:** `frontend` runs locally at `http://localhost:3000` against the live
Coston2 deployment below. _(video link placeholder)_

**GitHub repo:** https://github.com/Aaditya1273/FLARE

**How this project uses Flare (detailed):**
- **FAssets**: `SilentVault.sol` holds real FXRP via `transferFrom`/`transfer`, and
  resolves the live `AssetManagerFXRP` contract through `FlareContractRegistry` at
  call time (`assetManager()`) rather than a hardcoded address, so it tracks FAssets
  upgrades automatically.
- **FTSOv2**: `ftsoV2()` resolves the live price feed contract the same way; the
  TEE's stop-loss policy checks the XRP/USD feed before deciding to settle.
- **FCC (Flare Confidential Compute)**: this is the load-bearing primitive — without
  a TEE, a private policy is impossible to evaluate at all. `SilentVault.
  requestSettlement` emits an `InstructionSent` event in the exact shape a
  production FCC deployment consumes; the TEE extension implements the same
  interface in a clearly-labeled `SIMULATED_TEE` mode.
- **PMW (Protocol Managed Wallet)**: settlements and proof-of-reserves are
  authorized by a signed attestation the contract verifies against a configured
  `teeSigner` address — the same verification shape a PMW k-of-n signer would
  produce.

**What was newly built during the program:**
- `contracts/SilentVault.sol`, `contracts/SilentPolicyRegistry.sol`, 3 minimal Flare
  interfaces, mocks, and a 5-test Hardhat suite (all green).
- `tee-extension/`: FastAPI service with 5 endpoints, a 2-policy evaluation engine,
  and a simulated PMW signer — smoke-tested end-to-end against the live Coston2
  deployment (a TEE-signed attestation verifies on-chain).
- `frontend/`: Next.js + RainbowKit + wagmi/viem app with 3 cards (Shield, Set
  Private Policy, Prove & Settle), dark Bloomberg-terminal styling, client-side
  policy encryption via Web Crypto.
- Deploy scripts for Coston2/Songbird and an attestation-verification utility.

**Deployed contract addresses (Coston2, chainId 114):**
- SilentVault: `0xc205580a3e6339F643C1A4A1B5d95B5bF595BFc9`
- SilentPolicyRegistry: `0x2B1D9DD3cD77cF7f1A198E03127EC1B0D59Ad9dB`

**Roadmap:**
- Week 1: Uphold tag-mint integration, Firelight stXRP as a shield target.
- Month 1: security audit, 2 pilot XRP treasuries, apply for a Flare Ecosystem Grant.
- Q4: Flare mainnet + FBTC support.

**Distribution plan:** direct outreach to XRP treasuries already using FAssets
(VivoPower, Everything Blockchain), a Telegram bot for private stop-loss/payroll
alerts (no balance leaked in the alert itself), and Flare ecosystem grant funding to
support a pilot with 2 real treasuries in month 1.
