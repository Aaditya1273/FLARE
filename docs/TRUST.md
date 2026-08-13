# TRUST.md — SILENT 2.0 trust model and honest limitations

This document exists because judges (and future users) should never have to
reverse-engineer what's actually trusted vs. actually verified. Read this
before treating any part of SILENT 2.0 as audited or production-hardened.
It isn't. It's a hackathon build with a real cryptographic core and a clearly
labeled simulated trust root.

## What SILENT 2.0 does NOT claim

- **It does not claim to hide execution from MEV.** Once `settle()` is
  submitted as a public Coston2 transaction, its calldata (target, amount,
  revealed trigger) is visible in the mempool like any other transaction.
  What SILENT hides is **standing intent** — the policy itself (trigger
  price, trailing fraction, payroll recipients, XRPL destination) is never
  visible on-chain before it fires. That is a materially different, and
  materially weaker, privacy property than "fully shielded execution," and we
  are not claiming the latter.
- **It does not claim SIMULATED_TEE is attested hardware.** The enclave
  process (`extension/cmd/enclave`) runs as an ordinary Go binary with a
  locally-generated or environment-provided secp256k1 keypair. There is no
  remote attestation, no measured boot, no hardware root of trust. Anyone who
  can read the process's environment or memory can read the TEE private key
  and forge attestations. This is architecturally identical to what
  production would look like (same signature scheme, same endpoints, same
  on-chain verification path) but is not itself secure hardware.
- **It does not claim the FDC integration is complete Merkle-proof
  verification.** `contracts/src/mocks/MockFdcVerification.sol` is a
  test-only stand-in; `settle()` calls the real `FdcVerification` contract
  resolved via the registry, but this build has not been tested against a
  live FDC-attested XRPL payment end-to-end. The interface (`IFdcVerification.verifyPayment`)
  matches Flare's real `Payment` attestation type shape as documented, but
  integration against a live attestation round is unverified.
- **It does not claim an audit.** No third party has reviewed this code.
  `forge test` passing (30 tests) and `go test -race` passing (24 tests)
  demonstrate the code does what its own tests assert, not that it's free of
  bugs an adversary would find.
- **It does not claim FXRP tag-minting integration.** The vault consumes
  FXRP as a standard ERC20 (`shield()` calls `transferFrom`); it does not
  implement or wrap the Uphold tag-mint flow itself. That's Week 1 roadmap,
  not shipped.
- **It does not claim PMW (Protocol Managed Wallet) integration.** Settlement
  is authorized by a single allowlisted `teeSigner` ECDSA signature, not by
  Flare's actual k-of-n PMW infrastructure (which, as of this build, is not
  yet generally available). The `settle()` verification path is shaped so
  that swapping a single-signer allowlist for a PMW-attested signer set is a
  configuration change, not an interface change — but that swap has not
  happened.

## Trust assumptions, stated explicitly

| Component | What's trusted | Why |
|---|---|---|
| TEE signer allowlist | The vault owner correctly manages `teeSigners` and never adds a malicious key | No PMW / no on-chain attestation-hardware check yet (`TeeMachineRegistry` integration is roadmap) |
| SIMULATED_TEE process | Whoever operates the enclave process doesn't leak `TEE_PRIVATE_KEY` or tamper with the running binary | No remote attestation in this build |
| FTSO price re-check | Flare's FtsoV2 feed itself isn't manipulated | Standard trust assumption for any FTSO consumer; `settle()` does independently re-check freshness (`maxAge <= 300s`) and the trigger condition on-chain, so a stale or manipulated *off-chain* TEE decision can't move funds — but a manipulated *on-chain* feed still can |
| FDC verification | Flare's FdcVerification contract correctly verifies Merkle proofs against published attestation round roots | Standard trust assumption for any FDC consumer; unverified against a live round in this build (see above) |
| Keeper | Nothing — the keeper is explicitly untrusted. It only calls `tick()`, which re-emits ciphertext it cannot decrypt. Anyone can run one; running zero just means orders wait for someone else to tick them |  |
| Ciphertext exposure | Ciphertext length, not content, is visible on-chain | Every policy is padded to a fixed 256-byte frame (`extension/internal/ecies`, `frontend/lib/ecies.ts`) specifically so StopLoss vs. PayrollBatch vs. GuaranteedRedeem can't be distinguished by size alone. Ciphertext *count* and *timing* (when a `PolicySet` or `settle()` happens) are still observable metadata this design does not hide. |

## Known limitations

- Rate limits: FDC attestation rounds are not instant and are rate-limited by
  Flare's protocol design; `GuaranteedRedeem` settlement latency is bounded
  by that round cadence, not by SILENT.
- No slashing or bonding for the TEE signer — a compromised or malicious
  signer can be removed from the allowlist by the owner, but funds settled
  under a bad attestation before removal are not recoverable by this
  contract (no owner withdraw / no pause).
- `MAX_ALLOWED_AGE` (300s) is a fixed on-chain ceiling; it is not
  configurable per-order today.
- The frontend's ECIES implementation (`@noble/curves` + `@noble/hashes` +
  Web Crypto AES-GCM) and the Go side's ECIES implementation
  (`golang.org/x/crypto/hkdf` + `crypto/aes`) are a from-scratch compact
  construction — ECDH → HKDF-SHA256 → AES-256-GCM — chosen deliberately
  instead of go-ethereum's `crypto/ecies` package specifically so both
  implementations could be verified byte-for-byte against each other
  (see the interop check referenced in `docs/ARCHITECTURE.md`). It has not
  been independently audited.
