import pytest

from src.scoring.score import compute_probability
from src.signals.evaluate import SignalResult

CFG = {
    "sigmoid_k": 2.5,
    "weights": {"arrangement": 0.25, "rsi": 0.10, "volume": 0.10},
}


def sig(key, score):
    return SignalResult(key, score, key, "")


class TestScoring:
    def test_zero_signals_is_50(self):
        res = compute_probability([sig("arrangement", 0.0)], CFG)
        assert res.up_probability == pytest.approx(50.0)
        assert res.down_probability == pytest.approx(50.0)

    def test_positive_above_50(self):
        res = compute_probability([sig("arrangement", 1.0)], CFG)
        assert res.up_probability > 50.0

    def test_negative_below_50(self):
        res = compute_probability([sig("arrangement", -1.0)], CFG)
        assert res.up_probability < 50.0

    def test_probabilities_sum_100(self):
        res = compute_probability(
            [sig("arrangement", 0.7), sig("rsi", -0.3)], CFG
        )
        assert res.up_probability + res.down_probability == pytest.approx(100.0)

    def test_breakdown_sorted_by_contribution(self):
        res = compute_probability(
            [sig("rsi", 0.1), sig("arrangement", 1.0)], CFG
        )
        contribs = [abs(c.contribution) for c in res.breakdown]
        assert contribs == sorted(contribs, reverse=True)

    def test_unknown_key_zero_weight(self):
        res = compute_probability([sig("nonexistent", 1.0)], CFG)
        assert res.up_probability == pytest.approx(50.0)

    def test_symmetry(self):
        pos = compute_probability([sig("arrangement", 0.8)], CFG)
        neg = compute_probability([sig("arrangement", -0.8)], CFG)
        assert pos.up_probability == pytest.approx(neg.down_probability)

    def test_extreme_bounded(self):
        signals = [sig(k, 1.0) for k in CFG["weights"]]
        res = compute_probability(signals, CFG)
        assert 50.0 < res.up_probability < 100.0
