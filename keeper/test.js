import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingOrderIds, withRetry, Keeper } from "./index.js";

test("pendingOrderIds: returns orders with a policy but no settlement", () => {
  const policy = [{ orderId: 1n }, { orderId: 2n }];
  const settled = [];
  assert.deepEqual(pendingOrderIds(policy, settled), [1n, 2n]);
});

test("pendingOrderIds: excludes already-settled orders", () => {
  const policy = [{ orderId: 1n }, { orderId: 2n }];
  const settled = [{ orderId: 1n }];
  assert.deepEqual(pendingOrderIds(policy, settled), [2n]);
});

test("pendingOrderIds: empty settled events returns all policy orders", () => {
  const policy = [{ orderId: 5n }];
  assert.deepEqual(pendingOrderIds(policy, []), [5n]);
});

test("pendingOrderIds: de-duplicates repeated PolicySet events for the same order", () => {
  const policy = [{ orderId: 3n }, { orderId: 3n }];
  assert.deepEqual(pendingOrderIds(policy, []), [3n]);
});

test("pendingOrderIds: returns empty array when everything is settled", () => {
  const policy = [{ orderId: 1n }, { orderId: 2n }];
  const settled = [{ orderId: 1n }, { orderId: 2n }];
  assert.deepEqual(pendingOrderIds(policy, settled), []);
});

test("pendingOrderIds: no policy events returns empty array", () => {
  assert.deepEqual(pendingOrderIds([], []), []);
});

test("withRetry: returns on first success without retrying", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry: retries on failure then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async (attempt) => {
      calls++;
      if (attempt < 3) throw new Error("transient");
      return "recovered";
    },
    { attempts: 5, sleep: async () => {} }
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry: throws the last error after exhausting attempts", async () => {
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          throw new Error("always fails");
        },
        { attempts: 3, sleep: async () => {} }
      ),
    /always fails/
  );
});

test("Keeper: constructor requires a vaultAddress", () => {
  assert.throws(() => new Keeper({ provider: {} }), /vaultAddress is required/);
});

test("Keeper: constructor requires a provider", () => {
  assert.throws(() => new Keeper({ vaultAddress: "0x0000000000000000000000000000000000dEaD" }), /provider is required/);
});

test("Keeper: start()/stop() is idempotent and does not throw", () => {
  const keeper = new Keeper({
    provider: { queryFilter: async () => [] },
    vaultAddress: "0x0000000000000000000000000000000000dEaD",
    pollIntervalMs: 1_000_000,
  });
  keeper.start();
  keeper.start(); // second start() should be a no-op, not a second timer
  keeper.stop();
  keeper.stop(); // stopping twice must not throw
});
