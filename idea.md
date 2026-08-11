The Product: SILENT - Confidential XRPFi Operating System
One-liner: The first private institutional treasury and settlement rail for XRP on Flare.

Problem: XRP is $150B asset with no privacy. Every FXRP vault, redemption, and payroll today leaks alpha -> MEV, front-running, competitor intel. That's why XRPFi has no TVL.

Solution: Shield FXRP into a TEE vault where balances, policies, and triggers are encrypted. Only commitment hashes are on-chain. The TEE evaluates private rules and settles via Protocol Managed Wallets.

This is a product, not a project. Every XRP treasury, DAO, and crypto payroll company is the customer. Flare can take this to Uphold, Firelight, and XRPL enterprises tomorrow.

Why This Brutally Beats Everyone and Wins Both Bounties
What others do

What SILENT does

Use FXRP or FCC

Uses FAssets + FTSOv2 + FDC + FCC + PMW in ONE flow - no one else does this

Public vault logic

Private policy engine inside TEE. Without TEE, product is impossible

Demo only

Enterprise compliance built-in: Proof-of-reserves via TEE attestation

For Bounty 1 - Interoperable Asset Products:
You use FAssets deeply, not superficially. FXRP mint via tag-minting, FXRP transfer, redemption, and you use FTSO for pricing. FAssets is a trustless, over-collateralized bridge connecting non smart contract networks to Flare that enables wrapped tokens for BTC, DOGE and XRPand FXRP is a one-to-one representation by depositing collateral through independent agents. You drive real TVL retention, which is Flare's KPI. 

For Bounty 2 - Confidential Compute Apps:
You use FCC exactly as designed. FCC extends Flare with TEEs to enable secure off-chain computation, cross-chain transaction signing, and fast data attestation, and provides secure offchain computation and cross-chain transaction signing via Protocol Managed Wallets. Applications are organized as Flare Compute Extensions. You are not building a toy, you are building the PMW + private key management use case they wrote the whitepaper for.

Judges score: Product usefulness, Flare integration quality, technical execution, evidence of new work, clarity. This hits all 5 with a startup narrative.

Architecture - Looks Production, Builds in 1 Day
You use 2 repos everyone uses, so you ship fast:

1. On-chain (Flare Coston2 - Chain ID 114):
SilentVault.sol -> handles FXRP deposits, emits Instruction event for FCC, stores only bytes32 commitment + attestationProof

2. Off-chain TEE Extension (from flare-ai-kit):
Python Docker image, hash registered as supported code version. It does:

Decrypt user payload with TEE private key (never leaves enclave)
Evaluate PRIVATE policy: if FTSO XRP/USD < trigger -> redeem 30%, payroll batch: [addr1: 1000 FXRP,...]
Sign settlement via PMW pattern: assembly and signing of transactions on external blockchains through smart contract calls
Return signed result + TEE attestation verifiable on-chain
3. Frontend:
3 buttons only: [Shield FXRP] [Set Private Policy] [Prove Solvency]
Shield shows: On-chain = 0xabc...commitment. Actual amount hidden.
Prove shows: TEE attestation "Reserves > $1M - verified by TEE id 0x..." No balance leaked.

24-Hour Execution Plan
Mins 0-4: Foundation

Clone flare-hardhat-starter, deploy on Coston2: FXRP, AssetManagerFXRP interface, SilentVault
Clone flare-ai-kit confidential container example
Mins 4-10: Core TEE Logic - Build only 2 policies

Policy A: Confidential Stop-Loss - trigger encrypted, re-checked on-chain against FTSO (like DarkStop pattern but institutional)
Policy B: Confidential Payroll - batch encrypted, single uniform settlement, no order flow leakage (like Sotto pattern)
Mins 10-16: Frontend + Wiring

viem/wagmi, show commitment hashes, show attestation verification from TeeMachineRegistry
Min 16-20: Video + Docs
Record this demo script:

Mint 100 FXRP from exchange -> Shield -> Explorer shows only hash
Set private stop at $0.48 (encrypted)
Mock FTSO drop -> TEE auto-redeems, shows PMW XRPL tx + attestation proof
Prove reserves for compliance without revealing amount
Mins 20-24: Submission Packaging
Deploy same contracts to Songbird + Flare Mainnet (even if with 0.1 FXRP) - judges love mainnet.

Submission Text That Wins
Project: SILENT - Confidential XRPFi OS
Bounties: BOTH - Interoperable Asset Products + Confidential Compute Apps
Target user: XRP treasuries, DAOs, payroll providers managing >$1M XRP who cannot use transparent DeFi
Flare integration: Deep FAssets lifecycle + FTSOv2 price triggers + FCC FCE with PMW settlement + on-chain attestation verification. Without FCC, private policy evaluation is impossible.
New work during hackathon: Built SilentVault, TEE extension v1 with 2 private policies, PMW settlement flow, proof-of-reserve attestation, frontend + Coston2/Songbird/Mainnet deployments.
Roadmap: Week 1: Audit TEE image reproducibility, integrate Uphold tag-mint. Month 1: Pilot with 2 XRP treasuries, apply for Flare Ecosystem Grant.

This is fundable because Flare Summer Signal is an open online hackathon for builders creating real products on Flareand they explicitly want to support more serious product work instead of forcing every team to build from zero.

You are not competing with 544 hackers building toys. You are giving Flare the enterprise privacy layer they need to pitch XRPFi to institutions.

