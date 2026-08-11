# DEMO_SCRIPT.md — 60 seconds

**0:00–0:10 — The problem**
"XRP is a $150B asset. On Flare, every FXRP position is public — balance,
liquidation price, payroll, all of it. That's why institutions won't bring
treasury on-chain, and why $2.2B in incentives hasn't moved the needle."

**0:10–0:25 — Shield**
Connect wallet on Coston2. Enter an FXRP amount, click **Shield**. Point at the
explorer tx: only a commitment hash is visible on-chain — no amount, anywhere.

**0:25–0:40 — Set Private Policy**
Paste the commitment into **Set Private Policy**, choose Stop-Loss, set a trigger
above the current price. Show it encrypting client-side before the tx — only
ciphertext + hash land on-chain, in `SilentPolicyRegistry`.

**0:40–0:50 — TEE evaluates and settles**
Explain: inside the TEE, the policy is evaluated against the live FTSO XRP/USD
feed. Since the trigger is above spot, it fires — the TEE signs a settlement
attestation, `SilentVault.settleWithAttestation` verifies it on-chain and releases
funds. No human, and no chain observer, ever saw the trigger price.

**0:50–1:00 — Prove & Settle (proof of reserves)**
Click **Prove Reserves** with a $1M threshold. TEE returns a signed attestation;
the contract verifies it on-chain and shows "Verified — TEE ID 0x..., Code hash
0x...". Reserves are proven above threshold without revealing the actual balance.
That's SILENT: FAssets custody, FTSO pricing, and FCC-grade confidential
compute, chained into one settlement rail.
