"""Plain-assert self-check for the 2 policy branches. Run: python test_policy_engine.py"""

from policy_engine import evaluate_policy


def test_stop_loss_not_triggered():
    assert evaluate_policy(
        {"type": "stop-loss", "trigger_price": "0.40", "target": "0x2222222222222222222222222222222222222222", "amount": "1000"},
        current_price=0.55,
        commitment="0xc",
    ) is None


def test_stop_loss_triggered():
    result = evaluate_policy(
        {"type": "stop-loss", "trigger_price": "0.90", "target": "0x2222222222222222222222222222222222222222", "amount": "1000"},
        current_price=0.55,
        commitment="0xc",
    )
    assert result is not None
    assert result["type"] == "stop-loss"
    assert result["amount"] == 1000


def test_payroll_batch():
    result = evaluate_policy(
        {"type": "payroll", "batch": [{"address": "0xa", "amount": 10}, {"address": "0xb", "amount": 20}]},
        current_price=0.55,
        commitment="0xc",
    )
    assert result is not None
    assert result["total"] == 30


def test_unknown_policy_rejected():
    try:
        evaluate_policy({"type": "yield-farm"}, current_price=0.55, commitment="0xc")
        assert False, "expected ValueError"
    except ValueError:
        pass


if __name__ == "__main__":
    test_stop_loss_not_triggered()
    test_stop_loss_triggered()
    test_payroll_batch()
    test_unknown_policy_rejected()
    print("test_policy_engine: all checks passed")
