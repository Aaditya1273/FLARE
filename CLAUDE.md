# CLAUDE.md - SILENT 2.0 - MUST WIN 1ST PLACE BOTH BOUNTIES

## MISSION
Win Bounty 1 Interoperable Asset Products ($4k) AND Bounty 2 Confidential Compute ($4k) in Flare Summer Signal. 544 hackers. Deadline Aug 14. Judges are Flare core devs + BD. Previous SILENT 1.0 lost to Wraith/DarkStop because Hardhat+Python = toy, no FDC, marketing heavy, no TRUST.md.

## COMPETITIVE INTEL - BEAT THEM ALL
- Wraith: Foundry + Go TEE + keeper + 12+9+11 tests + TRUST.md + 4 primitives (FAssets, FTSO, FCC, FDC). Wins technical.
- DarkStop: Go TEE, ECIES, trailing stops private in enclave, FTSO re-check on-chain require(price <= trigger), 113 checks, honest SIMULATED_TEE docs.
- Signal Harbor: FTSO + FDC XRPL Payment proofs verified on-chain, live app + video, non-custodial risk console.
- XRPFlow: USD payroll settling in FXRP via FTSO, 13 tests, production Cloudflare.
- Harbor: Guaranteed FXRP redemption with destination-tag lane.
SILENT 2.0 must absorb ALL of them as features in ONE OS.

## WHAT IS SILENT 2.0
Confidential Treasury OS with Attested Redemption. The only product that hides standing intent BEFORE execution and proves settlement AFTER via FDC.
Problem: $150B XRP can't enter DeFi. Transparent FXRP vaults leak stop price, payroll, redemption -> hunted by MEV. TVL stuck $170M-$236M despite 2.2B FLR incentive program muted.
Solution: Shield FXRP into commitment-only vault. Policy encrypted client-side to TEE pubkey. Go enclave evaluates privately against FTSO inside enclave (keeper outside trust path). Settlement via attestation verified on-chain + FTSO re-check + FDC Merkle proof for XRPL redeem. Proof-of-reserves without revealing balance.

## TECH STACK MANDATE - NON-NEGOTIABLE
- Contracts: Foundry (forge) NOT Hardhat. Gas optimized, fuzz tests.
- TEE: Go (golang) NOT Python. Production standard for enclaves.
- Keeper: Node.js permissionless tick loop.
- Frontend: Next.js 14 + Tailwind + viem/wagmi + Noble ECIES (wire-compatible with go-ethereum crypto/ecies).
- Docs: TRUST.md, DEPLOY.md, ARCHITECTURE.md, SECURITY.md, AGENTS.md, SUBMISSION.md.

## CRITICAL FLARE ADDRESSES
- FlareContractRegistry: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019 (SAME on all networks)
- Resolve via registry.getContractAddressByName() - NEVER hardcode other addresses
- Coston2 RPC: https://coston2-api.flare.network/ext/C/rpc ChainID 114
- Coston2 FXRP ref: 0x0b6A3645c240605887a5532109323A3E12273dc7
- Coston2 Explorer: https://coston2-explorer.flare.network
- BlazeSwap Router ref: 0x8D29b61C41CF318d15d031BE2928F79630e068e6
- FtsoV2 ref: 0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d / 0x3d893C53D9e8056135C26C8c638B76C8b60Df726

## ARCHITECTURE - 4 PRIMITIVES CHAINED
Browser encrypts -> SilentVault2 (commitment only) -> FCC Instruction (OP_TYPE_SILENT) -> Go TEE decrypt + FTSO poll inside enclave + policy eval -> TEE signs settlement -> On-chain settle() verifies attestation + FTSO fresh + FDC proof -> FXRP swap OR XRPL redeem -> CrossChainEvidenceRecorded.

## CONTRACT SPECS - contracts/SilentVault2.sol
- shield(bytes32 commitment): pull FXRP via transferFrom, store commitment, emit Shielded
- setEncryptedPolicy(bytes ciphertext): store hash, emit PolicySet, no plaintext on-chain
- tick(uint256 orderId): permissionless, forwards to TEE via sendInstructions, emits InstructionSent
- settle(orderId, revealedTrigger, maxAge, attestation, fdcProof): verify attestation via ecrecover to teeSigner allowlist, verify FTSO getFeedById with maxAge <=300s and price <= trigger, verify FDC Merkle proof if redeem path, execute FXRP transfer or record redeem intent, emit Settled + CrossChainEvidenceRecorded
- proveReserves(attestation, threshold): verify reserves > threshold without revealing amount
- Use OpenZeppelin ReentrancyGuard, no owner withdraw, isolated liabilities
- Events for every state for explorer verification

## GO TEE SPECS - extension/
- internal/ecies: ECIES decrypt go-ethereum format, fixed-length padded plaintext to hide policy type
- internal/store: in-enclave order store with high-watermark for trailing
- internal/watcher: goroutine polls FTSO FLR/USD + XRP/USD block-latency feeds, detects trigger, submits settle tx with retry/backoff, same-nonce fee bump
- internal/config: OP_TYPE_SILENT, OP_COMMAND_EVAL byte-for-byte mirrored Solidity <-> Go
- cmd/enclave: FastAPI equivalent in Go, endpoints /decrypt, /evaluate, /settle, /attest/proof, log CODE_VERSION_HASH at startup for registry
- SIMULATED_TEE mode accepted for judging - document clearly, roadmap to real attested TEE on Songbird
- Must have go vet, go test ./... -race green, 60+ checks

## KEEPER SPECS - keeper/
- Permissionless loop, cannot decrypt ciphertext, only forwards bytes
- npm test 9+ tests

## FRONTEND SPECS - frontend/
- Dark institutional Bloomberg style, not colorful hackathon
- ShieldCard: input amount -> encrypt salt -> commitment = keccak256(amount+salt+user) -> shield tx -> show commitment hash only "On-chain visible: commitment only - amount hidden"
- PrivatePolicyCard: select policy type (StopLoss, TrailingStop, PayrollBatch, GuaranteedRedeem), input trigger or CSV, client-side ECIES encrypt to TEE pubkey, call setEncryptedPolicy, show ciphertext size fixed
- ProveCard: threshold input, fetch /api/attest/proof, call proveReserves, show "TEE attests reserves > $1M - Verified by TEE ID 0x... Code hash 0x... Attestation valid"
- Live table Pending -> Executed from chain events
- Explorer links for every tx, env NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

## DOCS SPECS
- README.md: What is SILENT 2.0, architecture mermaid, how Flare used (4 primitives), deployed addresses, how to run, judging mapping, why beats 544 BUIDLs
- docs/TRUST.md: What we do NOT claim (execution MEV not hidden, only standing intent), trust assumptions (SIMULATED_TEE, allowlist, PMW, FDC unavailable to third-party), ciphertext exposure
- docs/DEPLOY.md: Coston2 runbook, tx hashes, addresses, machine registration
- docs/ARCHITECTURE.md: Trust model, data flow
- SUBMISSION.md: DoraHacks format - project name, both bounties, target user (CFO/DAO treasury >$1M), demo link, repo, Flare integration, new work, addresses, roadmap Week1 Uphold tag-mint + Firelight stXRP, Month1 audit + 2 pilots, Q4 mainnet + FBTC, distribution plan
- DEMO_SCRIPT.md: 60-sec video script

## TESTING MANDATE
- forge test -vv (20+ tests): escrow accounting, conversion, settlement, reentrancy, zero/future/stale oracle, replay prevention, FTSO re-check
- forge test --fork-url Coston2 for live FTSO feed tests
- go test ./... -race 60+ checks
- keeper npm test, frontend npm test + build

## DEPLOYMENT
- npx hardhat not allowed, use forge script
- forge script scripts/Deploy.s.sol --rpc-url $COSTON2_RPC --broadcast
- Verify on explorer
- .env: PRIVATE_KEY, COSTON2_RPC, TEE_PUBLIC_KEY

## JUDGING OPTIMIZATION
1. Product usefulness: Solves TVL stuck because institutions won't expose books, makes 2.2B FLR incentive work
2. Flare integration quality: 4 primitives chained, impossible without FCC, registry-resolved not hardcoded
3. Technical execution: Deployed Coston2 + Songbird ready + Mainnet ready, tests green, attestation verified
4. Evidence of new work: All built during hackathon, clean slate repo
5. Clarity: Honest TRUST.md, video, roadmap to funding

## WHAT NOT TO DO
- No Hardhat, no Python TEE, no marketing claim "beats 544"
- No amount on-chain, only commitment
- No skipping FDC verification
- No hardcoding addresses except registry
- No 1 policy - need 4 policies

Build order: contracts Foundry -> Go enclave -> keeper -> frontend -> docs. No questions. Ship production.