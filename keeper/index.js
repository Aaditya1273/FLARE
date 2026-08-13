// SILENT 2.0 keeper: a permissionless loop that calls SilentVault2.tick(orderId)
// for every pending order. tick() only ever re-emits ciphertext the vault already
// stored - the keeper never decrypts it, never sees a policy's plaintext, and
// needs no special permission to run. Anyone can run this process; running more
// than one is harmless (tick() on an already-settled order simply reverts).
import { ethers } from "ethers";

export const VAULT_ABI = [
  "event PolicySet(uint256 indexed orderId, bytes32 indexed commitment, bytes32 policyHash)",
  "event Settled(uint256 indexed orderId, uint256 trigger, bytes attestation)",
  "function tick(uint256 orderId) returns (bytes32 id)",
  "function settledOrder(uint256 orderId) view returns (bool)",
];

/// Pure function: given the PolicySet and Settled event logs seen so far, returns
/// the sorted, de-duplicated list of orderIds that are open (have a policy, no
/// settlement yet). Kept pure and dependency-free so it's testable without a
/// live RPC connection.
export function pendingOrderIds(policySetEvents, settledEvents) {
  const settled = new Set(settledEvents.map((e) => e.orderId.toString()));
  const seen = new Set();
  const pending = [];
  for (const e of policySetEvents) {
    const key = e.orderId.toString();
    if (settled.has(key) || seen.has(key)) continue;
    seen.add(key);
    pending.push(e.orderId);
  }
  return pending;
}

/// Runs `fn` with exponential backoff on failure. Pure aside from calling `fn`
/// and `sleep` - both injectable so tests never need real timers or network I/O.
export async function withRetry(fn, { attempts = 5, baseDelayMs = 500, sleep = defaultSleep } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Keeper {
  constructor({ provider, wallet, vaultAddress, pollIntervalMs = 15_000 }) {
    if (!vaultAddress) throw new Error("vaultAddress is required");
    if (!provider) throw new Error("provider is required");
    this.provider = provider;
    this.wallet = wallet;
    this.vaultAddress = vaultAddress;
    this.pollIntervalMs = pollIntervalMs;
    this.contract = new ethers.Contract(vaultAddress, VAULT_ABI, wallet ?? provider);
    this._timer = null;
  }

  async discoverPendingOrders(fromBlock = 0) {
    const policyLogs = await this.contract.queryFilter(this.contract.filters.PolicySet(), fromBlock);
    const settledLogs = await this.contract.queryFilter(this.contract.filters.Settled(), fromBlock);
    const policyEvents = policyLogs.map((l) => ({ orderId: l.args.orderId }));
    const settledEvents = settledLogs.map((l) => ({ orderId: l.args.orderId }));
    return pendingOrderIds(policyEvents, settledEvents);
  }

  /// Forwards one order's ciphertext by calling tick() - a plain contract call,
  /// no decryption, no inspection of the payload it causes to be re-emitted.
  async tickOrder(orderId) {
    return withRetry(() => this.contract.tick(orderId));
  }

  async runOnce(fromBlock = 0) {
    const pending = await this.discoverPendingOrders(fromBlock);
    const results = [];
    for (const orderId of pending) {
      try {
        const tx = await this.tickOrder(orderId);
        results.push({ orderId, ok: true, hash: tx.hash });
      } catch (err) {
        results.push({ orderId, ok: false, error: err.message });
      }
    }
    return results;
  }

  start(fromBlock = 0) {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this.runOnce(fromBlock).catch((err) => console.error("keeper tick loop error:", err));
    }, this.pollIntervalMs);
  }

  stop() {
    clearInterval(this._timer);
    this._timer = null;
  }
}

async function main() {
  const rpcUrl = process.env.COSTON2_RPC || "https://coston2-api.flare.network/ext/C/rpc";
  const vaultAddress = process.env.VAULT_ADDRESS;
  if (!vaultAddress) {
    console.error("VAULT_ADDRESS is required");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : undefined;
  if (!wallet) console.warn("no PRIVATE_KEY set - keeper will discover orders but cannot submit tick() transactions");

  const keeper = new Keeper({ provider, wallet, vaultAddress });
  console.log(`keeper started for vault ${vaultAddress} on ${rpcUrl}`);
  keeper.start();
}

// Only run the live loop when executed directly (`node index.js`), not on import.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
