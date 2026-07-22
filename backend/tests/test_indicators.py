import numpy as np
import pytest

from src.indicators import ema, macd, rsi, sma


class TestSMA:
    def test_basic(self):
        x = np.array([1, 2, 3, 4, 5], dtype=float)
        out = sma(x, 3)
        assert np.isnan(out[0]) and np.isnan(out[1])
        np.testing.assert_allclose(out[2:], [2.0, 3.0, 4.0])

    def test_window_equals_length(self):
        out = sma(np.array([2.0, 4.0, 6.0]), 3)
        assert np.isnan(out[:2]).all()
        assert out[2] == pytest.approx(4.0)

    def test_insufficient_data(self):
        out = sma(np.array([1.0, 2.0]), 5)
        assert np.isnan(out).all()

    def test_invalid_n(self):
        with pytest.raises(ValueError):
            sma(np.array([1.0]), 0)

    def test_constant_series(self):
        out = sma(np.full(10, 7.0), 5)
        np.testing.assert_allclose(out[4:], 7.0)


class TestEMA:
    def test_seed_is_sma(self):
        x = np.array([1, 2, 3, 4, 5, 6], dtype=float)
        out = ema(x, 3)
        assert out[2] == pytest.approx(2.0)  # 첫 유효값 = SMA(3)

    def test_recursive(self):
        x = np.array([1, 2, 3, 4], dtype=float)
        out = ema(x, 3)
        alpha = 0.5
        expected = alpha * 4 + (1 - alpha) * 2.0
        assert out[3] == pytest.approx(expected)

    def test_constant_series(self):
        out = ema(np.full(20, 5.0), 10)
        np.testing.assert_allclose(out[9:], 5.0)


class TestMACD:
    def test_shapes_and_nan(self):
        x = np.linspace(100, 200, 60)
        m, s, h = macd(x)
        assert len(m) == len(s) == len(h) == 60
        assert np.isnan(m[:25]).all()  # slow=26 워밍업

    def test_uptrend_positive(self):
        x = np.linspace(100, 200, 100)
        m, s, h = macd(x)
        assert m[-1] > 0  # 상승 추세에서 MACD 양수

    def test_constant_zero(self):
        x = np.full(100, 50.0)
        m, s, h = macd(x)
        assert m[-1] == pytest.approx(0.0)
        assert h[-1] == pytest.approx(0.0)


class TestRSI:
    def test_all_up_is_100(self):
        x = np.arange(1.0, 31.0)
        out = rsi(x, 14)
        assert out[-1] == pytest.approx(100.0)

    def test_all_down_is_0(self):
        x = np.arange(31.0, 1.0, -1)
        out = rsi(x, 14)
        assert out[-1] == pytest.approx(0.0)

    def test_flat_is_50(self):
        x = np.full(30, 10.0)
        out = rsi(x, 14)
        assert out[-1] == pytest.approx(50.0)

    def test_warmup_nan(self):
        x = np.arange(1.0, 31.0)
        out = rsi(x, 14)
        assert np.isnan(out[:14]).all()

    def test_range_bounds(self):
        rng = np.random.default_rng(42)
        x = 100 + np.cumsum(rng.normal(0, 1, 200))
        out = rsi(x, 14)
        valid = out[~np.isnan(out)]
        assert ((valid >= 0) & (valid <= 100)).all()
