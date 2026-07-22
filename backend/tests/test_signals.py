import numpy as np
import pytest

from src.signals.evaluate import (
    MA_PERIODS,
    arrangement_signal,
    compute_mas,
    cross_signals,
    disparity_signal,
    evaluate_daily,
    ma200_anchor_signal,
    rsi_signal,
    support_signal,
    volume_signal,
)


def make_uptrend(n=300, start=10000, slope=20):
    """꾸준한 상승 시계열 → 정배열이 되는 데이터."""
    return start + slope * np.arange(n, dtype=float)


def make_downtrend(n=300, start=20000, slope=20):
    return start - slope * np.arange(n, dtype=float)


class TestArrangement:
    def test_perfect_bull(self):
        mas = compute_mas(make_uptrend())
        sig = arrangement_signal(mas)
        assert sig.score == 1.0
        assert sig.meta["state"] == "perfect_bull"
        assert sig.meta["streak"] > 0

    def test_perfect_bear(self):
        mas = compute_mas(make_downtrend())
        sig = arrangement_signal(mas)
        assert sig.score == -1.0
        assert sig.meta["state"] == "perfect_bear"

    def test_insufficient_data(self):
        mas = compute_mas(make_uptrend(n=10))
        sig = arrangement_signal(mas)
        assert sig.score == 0.0


class TestCross:
    def test_golden_cross_detected(self):
        # 하락 후 급반등 → 5일선이 20일선을 상향돌파
        down = make_downtrend(n=100, start=20000, slope=30)
        up = down[-1] + 80 * np.arange(1, 21, dtype=float)
        closes = np.concatenate([down, up])
        volumes = np.full(len(closes), 1000.0)
        mas = compute_mas(closes)
        results = cross_signals(mas, volumes)
        golden = [r for r in results if r.meta["type"] == "golden"]
        assert len(golden) >= 1
        assert all(r.score > 0 for r in golden)

    def test_volume_confirmation_boosts(self):
        down = make_downtrend(n=100, start=20000, slope=30)
        up = down[-1] + 80 * np.arange(1, 21, dtype=float)
        closes = np.concatenate([down, up])
        vol_flat = np.full(len(closes), 1000.0)
        vol_spike = vol_flat.copy()
        vol_spike[-25:] = 5000.0  # 크로스 구간 거래량 급증

        mas = compute_mas(closes)
        flat = {r.meta["pair"]: r for r in cross_signals(mas, vol_flat)}
        spike = {r.meta["pair"]: r for r in cross_signals(mas, vol_spike)}
        for pair in flat:
            if flat[pair].meta["type"] == "golden" and pair in spike:
                assert spike[pair].score >= flat[pair].score

    def test_no_cross_in_steady_trend(self):
        mas = compute_mas(make_uptrend())
        volumes = np.full(300, 1000.0)
        assert cross_signals(mas, volumes) == []


class TestLevels:
    def test_ma200_above(self):
        closes = make_uptrend()
        sig = ma200_anchor_signal(closes, compute_mas(closes))
        assert sig.score == 1.0

    def test_ma200_below(self):
        closes = make_downtrend()
        sig = ma200_anchor_signal(closes, compute_mas(closes))
        assert sig.score == -1.0

    def test_disparity_overheat(self):
        # 완만한 상승 후 마지막에 +15% 급등 → 이격 과열
        closes = make_uptrend(n=300, slope=1)
        closes[-1] = closes[-2] * 1.15
        sig = disparity_signal(closes, compute_mas(closes))
        assert sig.score < 0
        assert sig.meta["disparity_pct"] > 5

    def test_disparity_neutral(self):
        closes = np.full(300, 10000.0)
        sig = disparity_signal(closes, compute_mas(closes))
        assert sig.score == 0.0

    def test_support_touch(self):
        # 20일선 부근에서 저가 지지 후 종가 회복 패턴
        closes = make_uptrend(n=300, slope=10)
        mas = compute_mas(closes)
        lows = closes.copy()
        lows[-3] = mas[20][-3] * 1.001  # 20일선 터치
        sig = support_signal(closes, lows, mas)
        assert sig.score > 0
        assert sig.meta["touches"] >= 1


class TestAux:
    def test_volume_surge(self):
        volumes = np.full(100, 1000.0)
        volumes[-1] = 2000.0
        sig = volume_signal(volumes)
        assert sig.score > 0

    def test_rsi_overbought_negative(self):
        closes = np.arange(1.0, 101.0)  # 전량 상승 → RSI 100
        sig = rsi_signal(closes)
        assert sig.score < 0  # 과매수는 하방 점수


class TestEvaluateDaily:
    def test_full_pipeline_uptrend(self):
        closes = make_uptrend()
        lows = closes * 0.99
        volumes = np.full(300, 1000.0)
        results = evaluate_daily(closes, lows, volumes)
        keys = {r.key for r in results}
        assert "arrangement" in keys
        assert "ma200_anchor" in keys
        # 순수 함수: 같은 입력 → 같은 출력
        results2 = evaluate_daily(closes, lows, volumes)
        assert [r.score for r in results] == [r.score for r in results2]

    def test_all_scores_in_range(self):
        rng = np.random.default_rng(7)
        closes = 10000 + np.cumsum(rng.normal(0, 100, 300))
        closes = np.abs(closes) + 1000
        lows = closes * 0.98
        volumes = np.abs(rng.normal(1000, 300, 300))
        for r in evaluate_daily(closes, lows, volumes):
            assert -1.0 <= r.score <= 1.0, f"{r.key}: {r.score}"
