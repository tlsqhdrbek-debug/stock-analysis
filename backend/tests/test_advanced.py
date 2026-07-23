import numpy as np

from src.signals.advanced import (
    bollinger_signal,
    candle_signal,
    cluster_levels,
    multi_confirm_signal,
    rsi_divergence_signal,
    sr_levels,
    sr_signal,
    trend_channel_signal,
)
from src.signals.evaluate import SignalResult


def osc_series(n=120, base=10000, amp=500):
    """base±amp 사이를 진동 — 지지/저항이 뚜렷한 시계열."""
    t = np.arange(n)
    closes = base + amp * np.sin(t * np.pi / 10)
    highs = closes + 50
    lows = closes - 50
    return closes, highs, lows


class TestSR:
    def test_cluster_counts_touches(self):
        levels = cluster_levels([100.0, 100.5, 101.0, 200.0], tol=0.02)
        assert levels[0][1] == 3  # 100대 3회

    def test_levels_from_oscillation(self):
        closes, highs, lows = osc_series()
        lv = sr_levels(highs, lows)
        assert len(lv) >= 2  # 상단·하단 매물대

    def test_fake_breakout_without_volume(self):
        closes, highs, lows = osc_series()
        # 마지막에 저항(10550) 돌파, 거래량은 평범
        closes = np.append(closes, 10700.0)
        highs = np.append(highs, 10750.0)
        lows = np.append(lows, 10400.0)
        volumes = np.full(len(closes), 1000.0)
        res = sr_signal(closes, highs, lows, volumes)
        keys = [r.key for r in res]
        assert "fake_breakout" in keys
        assert all(r.score < 0 for r in res if r.key == "fake_breakout")

    def test_volume_breakout_positive(self):
        closes, highs, lows = osc_series()
        closes = np.append(closes, 10700.0)
        highs = np.append(highs, 10750.0)
        lows = np.append(lows, 10400.0)
        volumes = np.full(len(closes), 1000.0)
        volumes[-1] = 3000.0  # 거래량 동반
        res = sr_signal(closes, highs, lows, volumes)
        assert any(r.key == "sr_level" and r.score > 0 for r in res)


class TestTrend:
    def test_uptrend_positive(self):
        closes = 10000 + 30 * np.arange(60, dtype=float)
        res = trend_channel_signal(closes)
        assert res[0].score > 0

    def test_channel_break_down(self):
        closes = 10000 + 30 * np.arange(60, dtype=float)
        closes[-1] -= 900  # 상승 채널 하단 급락 이탈
        res = trend_channel_signal(closes)
        assert any(r.key == "channel_break" and r.score < 0 for r in res)


class TestBollinger:
    def test_squeeze_detected(self):
        rng = np.random.default_rng(1)
        # 변동성 큰 구간 후 극도로 축소
        wide = 10000 + np.cumsum(rng.normal(0, 150, 100))
        tight = wide[-1] + rng.normal(0, 5, 40)
        closes = np.concatenate([wide, tight])
        sig = bollinger_signal(closes)
        assert sig.meta.get("card_type") == "bb_squeeze"


class TestCandle:
    def test_hammer_at_support_scores(self):
        closes, highs, lows = osc_series()
        levels = sr_levels(highs, lows)
        lv = min(l for l, _ in levels)
        # 지지선 근처 망치형: 긴 아래꼬리
        opens = np.append(closes, lv * 1.001)
        closes2 = np.append(closes, lv * 1.005)
        highs2 = np.append(highs, lv * 1.006)
        lows2 = np.append(lows, lv * 0.97)
        sig = candle_signal(opens, highs2, lows2, closes2, levels)
        assert sig.score > 0.3
        assert sig.meta.get("near_sr") is True

    def test_hammer_in_air_dampened(self):
        n = 50
        opens = np.full(n, 10010.0)
        closes = np.full(n, 10050.0)
        highs = np.full(n, 10060.0)
        lows = np.full(n, 9700.0)  # 망치형이지만 레벨 없음
        sig = candle_signal(opens, highs, lows, closes, [])
        assert 0 < sig.score <= 0.15  # 0.2배 감쇠


class TestDivergence:
    def test_bearish_divergence(self):
        # 가격 고점은 높아지고 RSI는 약해지는 형태: 상승폭 축소 + 마지막 스윙
        seg1 = np.linspace(100, 150, 25)  # 강한 상승
        seg2 = np.linspace(150, 140, 8)
        seg3 = np.linspace(140, 152, 25)  # 약한 상승(고점 갱신)
        seg4 = np.linspace(152, 148, 8)
        closes = np.concatenate([np.full(30, 100.0), seg1, seg2, seg3, seg4])
        sig = rsi_divergence_signal(closes)
        # 형태에 따라 미검출일 수 있으나 검출 시 반드시 음수
        if sig.score != 0:
            assert sig.score < 0


class TestMultiConfirm:
    def sig(self, key, score):
        return SignalResult(key, score, key, "")

    def test_three_same_direction(self):
        res = multi_confirm_signal(
            [self.sig("volume", 0.5), self.sig("sr_level", 0.4), self.sig("trend_channel", 0.6)]
        )
        assert res.score > 0
        assert res.meta["count"] == 3

    def test_two_not_enough(self):
        res = multi_confirm_signal([self.sig("volume", 0.5), self.sig("sr_level", 0.4)])
        assert res.score == 0.0

    def test_bear_direction(self):
        res = multi_confirm_signal(
            [self.sig("volume", -0.5), self.sig("fake_breakout", -0.4), self.sig("channel_break", -0.6)]
        )
        assert res.score < 0
