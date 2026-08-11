# CLAUDE.md - SILENT Project

## PROJECT MISSION
Win 1st place in BOTH bounties of Flare Summer Signal (Interoperable Asset Products $6k + Confidential Compute Apps $6k). 544 competitors. Judges are Flare founders. They need fundable products, not demos, for Flare 2.0 mainnet launch Q3 2026.

## WHAT IS SILENT
SILENT - Confidential XRPFi Operating System. First private institutional treasury rail for XRP on Flare.

Problem: XRP is $150B but transparent. Institutions won't bring treasury on-chain if liquidation price, payroll, and balances are public. FXRP DeFi leaks alpha -> MEV, front-running. That's why TVL stuck at $170M-$236M despite 2.2B FLR incentive program that went muted.

Solution: Shield FXRP into TEE vault. Only commitment hash on-chain. Policy encrypted, evaluated inside TEE. Settlement via Protocol Managed Wallets (PMW) to XRPL/FXRP with attestation proof. Prove solvency without revealing amount.

## WHY THIS WINS BOTH BOUNTIES
- Bounty 1 (FAssets): Uses deep FAssets lifecycle - tag-minting via Uphold flow, FXRP shield, transfer, redeem + FTSOv2 pricing + USD0. Drives sticky institutional TVL, not mercenary farming.
- Bounty 2 (FCC): FCC is ESSENTIAL. Without TEE, private policy impossible. Uses: Secure Offchain Computation, Cross-Chain Signing via PMW, Attestation Verification, Private Key Management. FCE = Flare Compute Extension.

This is what Flare 2.0 needs to pitch to VivoPower ($100M XRP), Everything Blockchain, BitGo/Fireblocks.

## CRITICAL FLARE ADDRESSES - NEVER HARDCODE OTHERS
- FlareContractRegistry: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019 (SAME on all Flare networks)
- Always resolve via: registry.getContractAddressByName("AssetManagerFXRP", "FtsoV2", "TeeMachineRegistry", etc.)
- Coston2 FXRP Token Ref: 0x0b6A3645c240605887a5532109323A3E12273dc7
- Coston2 RPC: https://coston2-api.flare.network/ext/C/rpc
- ChainID: 114 (Coston2), 14 (Flare Mainnet), 19 (Songbird)
- Explorer: https://coston2-explorer.flare.network

## ARCHITECTURE - PRODUCTION LEVEL, 1 DAY SHIPPABLE

### File Structure YOU MUST CREATE
/contracts/
  SilentVault.sol - main vault, commitment storage, Instruction emit, attestation verify
  SilentPolicyRegistry.sol - encrypted policy hash storage
  interfaces/ - IFlareContractRegistry, IAssetManager, IFtsoV2
  mocks/MockAssetManager.sol
/scripts/
  deploy-coston2.ts, deploy-songbird.ts, verify-attestation.ts
/tee-extension/
  Dockerfile - reproducible, log CODE_VERSION_HASH
  app.py - FastAPI: /api/shield, /api/evaluate, /api/settle, /api/attest/proof
  policy_engine.py - 2 policies ONLY: stop-loss + payroll batch
  pmw_signer.py - simulates PMW signing (document migration to real PMW)
  requirements.txt
/frontend/
  app/page.tsx - 3 cards only: Shield, Set Private Policy, Prove & Settle
  components/ShieldCard.tsx, PrivatePolicyCard.tsx, ProveCard.tsx
  lib/flare.ts - viem clients + getFlareContract()
README.md, SUBMISSION.md, DEMO_SCRIPT.md, .env.example

### SilentVault.sol Spec
- shield(amount, commitment): pulls FXRP via transferFrom, stores commitment, emits Shielded(user, commitment, timestamp)
- setEncryptedPolicy(encryptedPolicy, policyHash): stores hash, emits PolicySet
- requestSettlement(commitment, encryptedExecution): emits InstructionSent(id, payload) - FCC pattern
- settleWithAttestation(commitment, attestation, target, amount): verify attestation (mock verify now, check TeeMachineRegistry later), execute FXRP transfer, emit Settled with proof
- proveReserves(attestation, threshold) view: verify attestation > threshold
- Must fetch FTSO price via registry in settle flow
- Ownable, ReentrancyGuard, real FXRP handling

### TEE Extension Spec
- /api/shield: keccak256(amount + salt + user) => commitment
- /api/evaluate: decrypt policy + fetch FTSO price from Coston2, if stop-loss and price < trigger => settlement payload, if payroll => batch payload. Never log plaintext.
- /api/settle: mock PMW sign - sign with TEE key, return signedTx + attestation = sign(keccak(result+teeId))
- /api/attest/proof: return teeId, codeVersionHash (sha256 of Docker), attestation sig
- Log CODE_VERSION_HASH on startup
- Since FCC proxy not fully public, implement SIMULATED_TEE mode with local keypair but correct interface

### Frontend Spec
- Dark Bloomberg-terminal style, institutional, not colorful
- viem/wagmi + RainbowKit
- ShieldCard: input amount -> Shield -> show tx + commitment hash + "On-chain: 0xabc... commitment only - amount hidden"
- PrivatePolicyCard: select Stop-Loss/Payroll, input trigger or CSV, encrypt client-side with TEE pubkey (ephemeral keypair for demo), call setEncryptedPolicy
- ProveCard: input threshold, call /api/attest/proof, then proveReserves, show green "TEE attests reserves > $1M - Verified by TEE ID 0x... Code hash 0x..."
- Show explorer links for every tx

## DEVELOPMENT RULES
1. Production code only. No TODOs. No placeholders. Comments explaining FCC/PMW.
2. Never hardcode contract addresses except registry. Resolve everything via registry.
3. Keep scope to 2 policies. Don't add extra features.
4. Frontend never shows actual amount on-chain, only commitment hash. That's the privacy moat.
5. All contracts must emit events for explorer verification.
6. Dockerfile must be reproducible.
7. Write README mapping to 5 judging criteria explicitly.

## JUDGING OPTIMIZATION - PUT THIS IN README
1. Product usefulness: Solves $150B XRP privacy blocking institutional TVL, makes 2.2B FLR incentive work
2. Flare integration quality: Full stack - tag-mint FXRP, FTSO, FDC, FCC TEE, PMW - not a fork
3. Technical execution: Deployed Coston2 + Songbird + Mainnet, working demo, attestation verification
4. Evidence of new work: List all built during hackathon
5. Clarity: Enterprise pitch, video, roadmap to funding

Add section "Why This Beats 544 BUIDLs" - we combine both tracks, enterprise, PMW settlement (no one else does).

## COMMANDS
npm install
npx hardhat compile
npx hardhat run scripts/deploy-coston2.ts --network coston2
cd tee-extension && docker build -t silent-tee . && docker run -p 8000:8000 silent-tee
cd frontend && npm run dev

.env:
PRIVATE_KEY=0x...
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc

## SUBMISSION PACKAGE
README.md: What is SILENT, ASCII architecture, How Flare used, How to run, Deployed addresses, Video placeholder
SUBMISSION.md:
- Project: SILENT - Confidential XRPFi OS
- Bounties: BOTH Bounty 1 + Bounty 2
- Description: 2 lines
- Target user: CFO, DAO treasury >$1M XRP
- Demo link, GitHub, How uses Flare (detailed), New work, Contract addresses, Roadmap (Week1: Uphold+Firelight stXRP, Month1: audit+2 pilots, Q4: mainnet+FBTC), Distribution
DEMO_SCRIPT.md: 60-sec script

## WHAT NOT TO DO
- Don't build generic DEX, lending fork, public vault
- Don't show amounts on-chain
- Don't skip attestation
- Don't hardcode addresses
- Don't add 10 policies - keep 2

Now build it. Start with contracts, then tee-extension, then frontend, then docs. No questions. Ship production.