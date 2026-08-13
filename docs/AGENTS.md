# AGENTS.md

Guidance for AI coding agents (and future contributors) working in this repo.

## Stack

Foundry (Solidity 0.8.24, via-ir) + Go 1.22 (TEE enclave) + Node/ethers
(keeper) + Next.js 14/TypeScript (frontend). No Hardhat, no Python — SILENT
2.0 deliberately replaced the 1.0 toy stack; do not reintroduce either.

## Non-negotiables

- **Never hardcode a Flare contract address except `FlareContractRegistry`**
  (`0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`, same on every Flare
  network). Everything else — `FtsoV2`, `AssetManagerFXRP`,
  `FdcVerification` — is resolved live via
  `registry.getContractAddressByName(...)`.
- **`OP_TYPE_SILENT` / `OP_COMMAND_*` constants must stay byte-identical**
  across `contracts/src/SilentVault2.sol` and
  `extension/internal/config/config.go`. If you change one, change both, and
  update `extension/internal/config/config_test.go:TestOpCodesMatchSolidity`.
- **The `settle()` digest encoding is load-bearing.** Any change to field
  order or types in `SilentVault2.settle()`'s `abi.encodePacked(...)` must be
  mirrored exactly in `extension/cmd/enclave/main.go:settleDigest` and
  `contracts/test/SilentVault2.t.sol:_digest`. Run `forge test` and
  `go test ./...` after touching either.
- **The ECIES wire format is load-bearing.** `extension/internal/ecies` (Go)
  and `frontend/lib/ecies.ts` (TypeScript) must produce interoperable
  ciphertext: 65-byte uncompressed ephemeral pubkey || 12-byte nonce ||
  AES-256-GCM(256-byte padded frame). If you change the padding size, KDF,
  or cipher on one side, change both, and re-verify interop (see
  `docs/ARCHITECTURE.md`'s note on how this was checked).
- **No owner withdraw path on `SilentVault2`.** Do not add one, even for
  "emergency" recovery — it breaks the core security property in
  `docs/SECURITY.md`.
- **Keep the policy set to exactly 4:** StopLoss, TrailingStop, PayrollBatch,
  GuaranteedRedeem. Don't add a 5th without updating `docs/ARCHITECTURE.md`
  and the frontend's `POLICY_TYPES`.

## Running the checks

```
forge test -vv                        # 30 contract tests
cd extension && go vet ./... && go test ./... -race   # 24 Go tests
cd keeper && npm test                  # 12 keeper tests
cd frontend && npm run build           # typecheck + build
```

All four must be green before calling a change done.

## Where things live

See `docs/ARCHITECTURE.md`'s repo map. Docs (`docs/TRUST.md` especially)
must stay honest — do not upgrade a claim from "documented limitation" to
"solved" unless the underlying code actually changed.
