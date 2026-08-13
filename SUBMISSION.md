# SUBMISSION.md

**Project:** SILENT 2.0 — Confidential Treasury OS with Attested Redemption

**Bounties:** BOTH — Interoperable Asset Products ($6k) + Confidential
Compute Apps ($6k)

**Description:** SILENT 2.0 shields FXRP behind commitment hashes and lets a
treasury set a private policy (stop-loss, trailing stop, payroll batch, or a
guaranteed XRPL redemption) that only a TEE ever decrypts. Settlement is
authorized by a TEE attestation the chain independently re-verifies against a
fresh FTSO price and, for redemptions, a real FDC Merkle proof.

**Target user:** A CFO or DAO treasury holding >$1M in XRP/FXRP who needs
standing orders (a stop-loss, payroll, a redemption trigger) executed without
broadcasting the trigger price or recipient list to every MEV bot watching
the mempool.

**Demo link:** _placeholder_
**Repo:** this repository

## How SILENT 2.0 uses Flare

- **FAssets** — real FXRP custody via `SafeERC20`, `AssetManagerFXRP`
  resolved live through `FlareContractRegistry`.
- **FTSO** — the TEE polls it privately to evaluate policies;
  `SilentVault2.settle()` independently re-reads it on-chain before
  authorizing any transfer, so a stale or manipulated off-chain decision
  cannot move funds.
- **FCC** — the private-policy evaluation and attestation-signing flow is the
  Flare Confidential Compute pattern end to end: `InstructionSent` is the
  FCC-consumable event, `extension/cmd/enclave` implements the TEE side in
  documented `SIMULATED_TEE` mode with an identical production interface.
- **FDC** — `GuaranteedRedeem` settlement verifies a Merkle proof of the
  XRPL-side payment via `IFdcVerification.verifyPayment` before recording
  `CrossChainEvidenceRecorded` — this is cross-chain evidence, not a
  frontend claim.

## New work built for this submission

- `contracts/src/` — SilentVault2.sol, SilentPolicyRegistry.sol,
  interfaces/IFlare.sol, 4 mocks (Foundry, Solidity 0.8.24, 30 tests
  including fuzz).
- `extension/` — a from-scratch Go TEE process: ECIES decrypt (ECDH+HKDF+AES-GCM),
  thread-safe policy store with private trailing high-watermark, an FTSO
  watcher with retrying settle-tx submission and same-nonce fee bumps, and 4
  HTTP endpoints (24 Go tests, `-race` clean).
- `keeper/` — a permissionless Node tick loop that forwards ciphertext it
  cannot decrypt (12 tests).
- `frontend/lib/ecies.ts` — client-side ECIES verified interoperable with the
  Go side via a real cross-language ciphertext round-trip during development.
- `docs/` — TRUST.md, ARCHITECTURE.md, SECURITY.md, DEPLOY.md, AGENTS.md.

The prior SILENT 1.0 (Hardhat + Python) was removed, not iterated on — this
is a from-scratch rebuild on the mandated Foundry/Go/Next.js stack.

## Contract addresses (Coston2)

| Contract | Address |
|---|---|
| SilentVault2 | `0x7a71e3D15a3B4E4Be6334D62A9d2C35042C987C0` |
| SilentPolicyRegistry | `0xCB721Fa081Faf75af9b4E94083d1483115505085` |

Deploy tx: `0x64fb7afff832a6df0456b1d98278743f4245c493d0cfc4bd5d92adcb93eff1f6`.
Full runbook and post-deploy health check: `docs/DEPLOY.md`.

## Roadmap

- **Week 1:** Uphold tag-mint integration for 1-tx FXRP onboarding; Firelight
  stXRP as a yield-bearing shield target.
- **Month 1:** third-party security audit; pilot with 2 XRP treasuries.
- **Q4:** Flare mainnet deployment; FBTC support.

## Distribution

A Telegram bot surfacing order status (pending/executed, no policy detail) for
treasury ops teams who want alerts without opening the dashboard, plus direct
outreach to XRP treasury partners (VivoPower-style holders, custody
providers) identified through Flare's existing FAssets ecosystem contacts.

## Honesty

See `docs/TRUST.md` for the full "what SILENT 2.0 does NOT claim" section —
MEV-hidden execution, attested (non-simulated) hardware, completed live FDC
round integration, PMW integration, and a third-party audit are all
explicitly not claimed by this build.

## Team & audit status

Built solo for Flare Summer Signal by [Aaditya1273](https://github.com/Aaditya1273)
(repo owner/committer). No third-party security audit has been performed —
that's Month 1 on the roadmap above, not a completed step. `LICENSE` (MIT)
is included so the code is reproducible and reviewable by anyone, judges
included.
