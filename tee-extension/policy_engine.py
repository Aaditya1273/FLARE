"""
Policy evaluation logic that runs INSIDE the TEE. Exactly two policies, by design:
stop-loss and payroll batch. SILENT stays shippable and auditable by not offering a
generic policy plugin system - see CLAUDE.md's scope rules.

Never log the plaintext policy anywhere in this module - callers are responsible for
keeping decrypted policy contents out of logs.
"""

from typing import Any


def evaluate_stop_loss(trigger_price: float, current_price: float, commitment: str, target: str, amount: int) -> dict[str, Any] | None:
    """If current XRP/USD price has fallen below the user's private trigger,
    return a settlement instruction; otherwise no action."""
    if current_price >= trigger_price:
        return None
    return {
        "type": "stop-loss",
        "commitment": commitment,
        "target": target,
        "amount": amount,
        "reason": f"price {current_price} < trigger {trigger_price}",
    }


def evaluate_payroll_batch(batch: list[dict[str, Any]], commitment: str) -> dict[str, Any] | None:
    """A payroll batch is a list of {address, amount} recipients. Always executes
    (payroll isn't price-conditional) - returns a single uniform settlement payload
    covering the whole batch."""
    if not batch:
        return None
    return {
        "type": "payroll",
        "commitment": commitment,
        "recipients": batch,
        "total": sum(int(r["amount"]) for r in batch),
    }


def evaluate_policy(policy: dict[str, Any], current_price: float, commitment: str) -> dict[str, Any] | None:
    """Dispatch on the decrypted policy's declared type. `policy` is only ever the
    plaintext after in-TEE decryption - never persisted, never logged."""
    ptype = policy.get("type")
    if ptype == "stop-loss":
        return evaluate_stop_loss(
            trigger_price=float(policy["trigger_price"]),
            current_price=current_price,
            commitment=commitment,
            target=policy["target"],
            amount=int(policy["amount"]),
        )
    if ptype == "payroll":
        return evaluate_payroll_batch(policy["batch"], commitment)
    raise ValueError(f"unknown policy type: {ptype}")


def _demo() -> None:
    assert evaluate_stop_loss(0.50, 0.60, "0xc", "0xt", 100) is None
    triggered = evaluate_stop_loss(0.50, 0.40, "0xc", "0xt", 100)
    assert triggered is not None and triggered["type"] == "stop-loss"

    assert evaluate_payroll_batch([], "0xc") is None
    batch = evaluate_payroll_batch([{"address": "0xa", "amount": 10}, {"address": "0xb", "amount": 20}], "0xc")
    assert batch is not None and batch["total"] == 30

    print("policy_engine self-check OK")


if __name__ == "__main__":
    _demo()
