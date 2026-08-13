# DEPLOY.md — Coston2 runbook

## Live deployment (this submission)

| Contract | Address |
|---|---|
| SilentVault2 | [`0x7a71e3D15a3B4E4Be6334D62A9d2C35042C987C0`](https://coston2-explorer.flare.network/address/0x7a71e3D15a3B4E4Be6334D62A9d2C35042C987C0) |
| SilentPolicyRegistry (owned by SilentVault2) | [`0xCB721Fa081Faf75af9b4E94083d1483115505085`](https://coston2-explorer.flare.network/address/0xCB721Fa081Faf75af9b4E94083d1483115505085) |
| FlareContractRegistry (Flare-provided) | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` |
| FXRP (Coston2 reference) | `0x0b6A3645c240605887a5532109323A3E12273dc7` |
| TEE signer (SIMULATED_TEE, this run) | `0xb0582716E1e8c25AC0d582B6AF2B66B9391e50f8` |

Deploy transaction: [`0x64fb7afff832a6df0456b1d98278743f4245c493d0cfc4bd5d92adcb93eff1f6`](https://coston2-explorer.flare.network/tx/0x64fb7afff832a6df0456b1d98278743f4245c493d0cfc4bd5d92adcb93eff1f6)

Post-deploy health check performed:
- `policyRegistry()` on-chain reads back `0xCB721Fa081Faf75af9b4E94083d1483115505085` (matches the `SilentPolicyRegistry` this vault deployed and owns).
- `teeSigners(0xb0582716E1e8c25AC0d582B6AF2B66B9391e50f8)` on-chain reads back `true`.
- `extension/cmd/enclave` run locally against this vault: `/healthz`, `/api/attest/proof`, and `/api/shield` all responded correctly, and the watcher resolved `FtsoV2` live via `FlareContractRegistry` on startup (see terminal log: `watcher ready, FTSO resolved live via FlareContractRegistry`).

## Live end-to-end verification (order #1, StopLoss)

Every step of the real flow — not a mock — was run against the live deployment above:

| Step | Tx / result |
|---|---|
| `approve` FXRP | [`0xb3b32b6e...`](https://coston2-explorer.flare.network/tx/0xb3b32b6e584639990303fa46a52234bc8545752a957da59303fb9debd60b7a25) |
| `shield(1.0 FXRP, commitment)` | [`0xb4dbd517...`](https://coston2-explorer.flare.network/tx/0xb4dbd51756c06f075128847248f1d722173481f51c6874d7ec2921f998082c9a) |
| policy encrypted client-side (ECIES to TEE pubkey), `setEncryptedPolicy` → `orderId=1` | [`0xdb52730b...`](https://coston2-explorer.flare.network/tx/0xdb52730b460e2764b52803c6e8ff765cd5647701e188a8adfcc83dbfddc926b8) |
| `tick(1)` — keeper-style forward, ciphertext re-emitted | [`0x85ec3b5e...`](https://coston2-explorer.flare.network/tx/0x85ec3b5eff4a1d552c0adb84f46095c57c9e12e7c6c2aa1277aacd8d05e7cbe1) |
| `/api/evaluate` — enclave decrypted the ciphertext, compared to live FTSO price, returned `{"decision":"settle"}` | ran locally |
| `/api/settle` — enclave signed the settlement attestation | ran locally |
| `settle(1, target, 0.4 FXRP, ...)` — attestation verified, FTSO re-checked fresh on-chain, funds transferred | [`0x240ee720...`](https://coston2-explorer.flare.network/tx/0x240ee7204843b581644ab52778416c4e8ebb2343cfcf42065e4ba7a2563d7383) |
| `shieldedAmount(commitment)` post-settle | `600000` (1,000,000 − 400,000, correct) |
| `/api/attest/reserves` + `proveReserves(attestation, 100000)` | returns `true` |
| `/api/attest/reserves` with an inflated threshold the reserves don't meet | refuses to sign (`422`, not a forged `true`) |

This is the complete shield → encrypt → tick → evaluate → attest → settle → prove-reserves loop, run against real contracts on Coston2, not a local Anvil fork or mocked TEE response.

## Deploying your own instance

### 1. Generate a TEE signer keypair

```bash
cd extension
go run ./cmd/enclave   # first run with no TEE_PRIVATE_KEY set logs a generated ephemeral key + its address
# for a stable signer across restarts, generate one explicitly and export it:
```

Or generate one standalone (any secp256k1 keygen works — the enclave logs
`TEE signer address (teeId): 0x...` on every boot regardless of source).

### 2. Deploy SilentVault2

```bash
cp .env.example .env.local        # fill in PRIVATE_KEY (deployer) and TEE_SIGNER_ADDRESS
source .env.local
export PRIVATE_KEY=0x$PRIVATE_KEY  # forge requires the 0x prefix
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast
```

The script logs the deployed `SilentVault2` and `SilentPolicyRegistry`
addresses, and registers `TEE_SIGNER_ADDRESS` as the initial allowlisted
signer in the constructor.

### 3. Run the TEE extension

```bash
cd extension
cp .env.example .env.local   # set TEE_PRIVATE_KEY, VAULT_ADDRESS from step 2
set -a && source .env.local && set +a
go run ./cmd/enclave
# or: docker build -t silent-enclave . && docker run -p 8000:8000 --env-file .env.local silent-enclave
```

### 4. Run the keeper

```bash
cd keeper
npm install
PRIVATE_KEY=0x... VAULT_ADDRESS=0x... npm start
```

### 5. Run the frontend

```bash
cd frontend
npm install
# update lib/deployments.json with your addresses + the TEE's public key
# (GET /api/attest/proof doesn't return the pubkey directly - derive it from
#  the TEE signer address's known public key, or add a pubkey field to your
#  own /api/attest/proof response if you extend it)
npm run dev
```

### Verifying on the explorer

Coston2's explorer supports source verification via `forge verify-contract`
once `COSTON2_EXPLORER_API_KEY` is configured in `foundry.toml`'s
`[etherscan]` block. Not run for this submission (time-boxed hackathon
deploy) — the deployed bytecode can be diffed against a local
`forge build` of this exact commit as an alternative verification path.

## Songbird / Flare mainnet

Not deployed for this submission. The only network-specific values in
`script/Deploy.s.sol` are the RPC URL and the FXRP token address (Coston2's
reference token differs from Songbird/mainnet's real FAssets FXRP) — the
`FlareContractRegistry` address is identical across all three networks.
