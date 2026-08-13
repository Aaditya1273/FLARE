# SECURITY.md

## Reporting

This is a hackathon submission, not a production system with a bug bounty.
If you find an issue, open a GitHub issue on this repo or contact the team
directly before public disclosure — see `SUBMISSION.md` for contact details.

## Contract security properties

`contracts/src/SilentVault2.sol`:

- **No owner withdraw.** The owner can only call `setTeeSigner` to manage the
  attestation-signer allowlist. There is no function, under any role, that
  moves a user's FXRP except `settle()`, and `settle()` requires a valid
  attestation from an allowlisted signer.
- **Isolated liabilities.** Every commitment tracks its own
  `shieldedAmount`; `settle()` requires `shieldedAmount[commitment] >= amount`
  before debiting, so no order can draw down funds shielded under a
  different commitment.
- **Replay protection.** `settledOrder[orderId]` is set before the external
  `safeTransfer` call (checks-effects-interactions) and checked at the top
  of `settle()`, so a given orderId can only ever execute once regardless of
  how many times its attestation is resubmitted.
- **Reentrancy.** `shield()` and `settle()` are `nonReentrant`
  (OpenZeppelin `ReentrancyGuard`); token transfers use `SafeERC20`.
- **Fresh price re-check.** `settle()` does not trust the TEE's off-chain
  price read — it re-reads `FtsoV2.getFeedById` itself and requires both
  `price <= revealedTrigger` and `block.timestamp - priceTs <= maxAge`, with
  `maxAge` hard-capped at `MAX_ALLOWED_AGE = 300` seconds regardless of what
  the caller requests.
- **Domain-separated signatures.** Every signed message is prefixed with
  `OP_TYPE_SILENT` and an operation-specific `OP_COMMAND_*` byte, so a
  signature produced for `proveReserves` can never be replayed as a
  `settle()` attestation even if the rest of the encoded fields collided.

## What this build has NOT had

- No third-party audit.
- No formal verification.
- No fuzzing beyond Foundry's built-in `testFuzz_*` (256 runs/case, see
  `contracts/test/SilentVault2.t.sol`).
- No mainnet deployment or real-value testing.

See `docs/TRUST.md` for the full trust model and honest limitations —
read that before relying on any security property implied here.

## Key management (SIMULATED_TEE mode)

`extension/internal/config` defaults `SIMULATED_TEE=true`, which generates
(or loads from `TEE_PRIVATE_KEY`) a plain secp256k1 keypair in process
memory. **This key is not hardware-protected.** Anyone with process/host
access can read it and forge attestations for every function that checks
`teeSigners`. Do not fund a SIMULATED_TEE deployment with real value.
