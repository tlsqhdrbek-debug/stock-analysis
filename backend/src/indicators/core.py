"""기술적 지표. 모두 순수 함수, numpy 벡터연산.

규약:
- 입력은 과거→최신 순 1차원 배열.
- 계산 불가 구간(워밍업)은 NaN.
"""

from __future__ import annotations

import numpy as np


def sma(x: np.ndarray, n: int) -> np.ndarray:
    """단순이동평균. 앞쪽 n-1개는 NaN."""
    x = np.asarray(x, dtype=np.float64)
    if n <= 0:
        raise ValueError("n must be positive")
    out = np.full_like(x, np.nan)
    if len(x) < n:
        return out
    cumsum = np.cumsum(np.insert(x, 0, 0.0))
    out[n - 1 :] = (cumsum[n:] - cumsum[:-n]) / n
    return out


def ema(x: np.ndarray, n: int) -> np.ndarray:
    """지수이동평균. 첫 유효값은 n개 SMA로 시드, 이후 재귀. 앞쪽 n-1개는 NaN."""
    x = np.asarray(x, dtype=np.float64)
    if n <= 0:
        raise ValueError("n must be positive")
    out = np.full_like(x, np.nan)
    if len(x) < n:
        return out
    alpha = 2.0 / (n + 1.0)
    out[n - 1] = x[:n].mean()
    for i in range(n, len(x)):
        out[i] = alpha * x[i] + (1.0 - alpha) * out[i - 1]
    return out


def macd(
    x: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """MACD(12,26,9). 반환: (macd_line, signal_line, histogram)."""
    x = np.asarray(x, dtype=np.float64)
    macd_line = ema(x, fast) - ema(x, slow)
    # signal은 macd_line의 유효 구간에 대한 EMA
    valid = ~np.isnan(macd_line)
    signal_line = np.full_like(x, np.nan)
    if valid.sum() >= signal:
        idx = np.where(valid)[0]
        seg = ema(macd_line[idx], signal)
        signal_line[idx] = seg
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def rsi(x: np.ndarray, n: int = 14) -> np.ndarray:
    """RSI (Wilder 방식). 앞쪽 n개는 NaN. 전량 상승 구간은 100."""
    x = np.asarray(x, dtype=np.float64)
    out = np.full_like(x, np.nan)
    if len(x) < n + 1:
        return out
    delta = np.diff(x)
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)

    avg_gain = gain[:n].mean()
    avg_loss = loss[:n].mean()
    out[n] = _rsi_value(avg_gain, avg_loss)
    for i in range(n + 1, len(x)):
        avg_gain = (avg_gain * (n - 1) + gain[i - 1]) / n
        avg_loss = (avg_loss * (n - 1) + loss[i - 1]) / n
        out[i] = _rsi_value(avg_gain, avg_loss)
    return out


def _rsi_value(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0.0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return 100.0 - 100.0 / (1.0 + rs)
