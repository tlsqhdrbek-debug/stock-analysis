"""고급 신호 — 수평 지지/저항, 추세 채널, 볼린저, 캔들패턴, RSI 다이버전스, 멀티 컨펌.

우선순위 원칙 (weights.yaml에 반영):
  거래량 > 지지·저항 > 추세 > 이평선 > 캔들패턴 > 보조지표
캔들패턴은 지지/저항 부근에서 나온 것만 유효 — 허공 캔들은 0.2배 감쇠.
이평선/저항 돌파는 거래량 미동반 시 fake breakout으로 감점.
전부 순수 함수.
"""

from __future__ import annotations

import numpy as np

from src.indicators import rsi as calc_rsi
from src.signals.evaluate import SignalResult


# ── 스윙 포인트 / 수평 지지·저항 ─────────────────────────


def find_swings(arr: np.ndarray, k: int = 3, high: bool = True) -> list[int]:
    """국소 고점/저점 인덱스."""
    out = []
    for i in range(k, len(arr) - k):
        w = arr[i - k : i + k + 1]
        if high and arr[i] >= w.max():
            out.append(i)
        elif not high and arr[i] <= w.min():
            out.append(i)
    return out


def cluster_levels(prices: list[float], tol: float = 0.015) -> list[tuple[float, int]]:
    """가격을 tol 비율 내에서 묶어 (레벨, 터치 횟수) 목록. 터치 많은 순."""
    out: list[tuple[float, int]] = []
    for p in sorted(prices):
        if out and abs(p - out[-1][0]) / out[-1][0] <= tol:
            lvl, cnt = out[-1]
            out[-1] = ((lvl * cnt + p) / (cnt + 1), cnt + 1)
        else:
            out.append((p, 1))
    return sorted(out, key=lambda x: -x[1])


def sr_levels(
    highs: np.ndarray, lows: np.ndarray, k: int = 3, tol: float = 0.015
) -> list[tuple[float, int]]:
    swing_prices = [float(highs[i]) for i in find_swings(highs, k, True)]
    swing_prices += [float(lows[i]) for i in find_swings(lows, k, False)]
    return [lv for lv in cluster_levels(swing_prices, tol) if lv[1] >= 2]


def sr_signal(
    closes: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    volumes: np.ndarray,
    tol: float = 0.015,
) -> list[SignalResult]:
    """수평 지지/저항 판정 + 거래량 미동반 돌파(fake breakout) 감지."""
    levels = sr_levels(highs, lows, tol=tol)
    if not levels:
        return []
    cur = float(closes[-1])
    prev = float(closes[-2]) if len(closes) > 1 else cur
    vol_avg = float(volumes[-20:].mean()) if len(volumes) >= 20 else float(volumes.mean())
    vol_confirmed = volumes[-1] > vol_avg * 1.3

    results: list[SignalResult] = []
    # 직전 봉에서 저항 레벨을 상향 돌파했는가
    broken = [
        (lv, n) for lv, n in levels if prev < lv <= cur and n >= 2
    ]
    if broken:
        lv, n = max(broken, key=lambda x: x[1])
        if vol_confirmed:
            results.append(SignalResult(
                "sr_level", 0.8, "저항 돌파(거래량 동반)",
                f"{n}회 반등했던 {lv:,.0f}원 저항을 거래량 실으며 돌파",
                {"card_type": "sr_resistance", "level": round(lv), "touches": n},
            ))
        else:
            results.append(SignalResult(
                "fake_breakout", -0.45, "거래량 없는 돌파",
                f"{lv:,.0f}원 저항 돌파했지만 거래량 미동반 — 속임수(fake) 가능성",
                {"card_type": "fake_breakout", "level": round(lv), "touches": n},
            ))
        return results

    # 근접 레벨 판정
    near = [(lv, n) for lv, n in levels if abs(cur - lv) / lv <= tol]
    if near:
        lv, n = max(near, key=lambda x: x[1])
        if lv <= cur:  # 지지 레벨 위에서 버티는 중
            results.append(SignalResult(
                "sr_level", min(0.75, 0.25 * n), f"매물대 지지({n}회)",
                f"과거 {n}번 반등한 {lv:,.0f}원 지지선 위에서 유지 중",
                {"card_type": "sr_support", "level": round(lv), "touches": n},
            ))
        else:  # 바로 위 저항
            results.append(SignalResult(
                "sr_level", -0.45, f"저항선 근접({n}회)",
                f"과거 {n}번 막힌 {lv:,.0f}원 저항선 바로 아래 — 돌파 여부 관건",
                {"card_type": "sr_resistance", "level": round(lv), "touches": n},
            ))
    return results


# ── 추세선·채널 ──────────────────────────────────────────


def trend_channel_signal(closes: np.ndarray, n: int = 40) -> list[SignalResult]:
    if len(closes) < n:
        return []
    y = closes[-n:]
    x = np.arange(n, dtype=np.float64)
    slope, intercept = np.polyfit(x, y, 1)
    norm = slope * n / y.mean()  # 기간 전체 % 기울기
    score = float(np.clip(norm / 0.10, -1.0, 1.0)) * 0.8
    direction = "상승" if norm > 0.02 else "하락" if norm < -0.02 else "횡보"
    out = [SignalResult(
        "trend_channel", score, f"{direction} 추세",
        f"최근 {n}일 회귀 추세 기울기 {norm * 100:+.1f}%",
        {"card_type": "trend_up" if score >= 0 else "trend_down", "slope_pct": round(norm * 100, 1)},
    )]
    resid = y - (slope * x + intercept)
    sd = float(resid.std())
    if sd > 0:
        dev = float(resid[-1]) / sd
        if norm > 0.02 and dev < -2:
            out.append(SignalResult(
                "channel_break", -0.6, "상승 채널 하단 이탈",
                "상승 추세 채널 아래로 벗어남 — 추세 전환 초기 신호일 수 있음",
                {"card_type": "channel_break", "deviation": round(dev, 1)},
            ))
        elif norm < -0.02 and dev > 2:
            out.append(SignalResult(
                "channel_break", 0.6, "하락 채널 상단 돌파",
                "하락 추세 채널 위로 벗어남 — 반등 전환 초기 신호일 수 있음",
                {"card_type": "channel_break", "deviation": round(dev, 1)},
            ))
    return out


# ── 볼린저밴드 ───────────────────────────────────────────


def _rolling_std(x: np.ndarray, n: int) -> np.ndarray:
    out = np.full_like(x, np.nan)
    if len(x) < n:
        return out
    c1 = np.cumsum(np.insert(x, 0, 0.0))
    c2 = np.cumsum(np.insert(x * x, 0, 0.0))
    mean = (c1[n:] - c1[:-n]) / n
    var = np.maximum(0.0, (c2[n:] - c2[:-n]) / n - mean * mean)
    out[n - 1 :] = np.sqrt(var)
    return out


def bollinger_signal(closes: np.ndarray, n: int = 20, hist: int = 120) -> SignalResult:
    if len(closes) < n + 10:
        return SignalResult("bollinger", 0.0, "볼린저 판정 불가", "데이터 부족")
    sd = _rolling_std(closes, n)
    c1 = np.cumsum(np.insert(closes, 0, 0.0))
    mid = np.full_like(closes, np.nan)
    mid[n - 1 :] = (c1[n:] - c1[:-n]) / n
    bw = (4 * sd) / mid  # 밴드폭 비율
    valid = bw[~np.isnan(bw)][-hist:]
    cur = bw[-1]
    pct = float((valid < cur).mean())  # 현재 밴드폭의 백분위
    if pct <= 0.2:
        return SignalResult(
            "bollinger", 0.0, "볼린저 스퀴즈",
            f"밴드폭이 최근 구간 하위 {pct * 100:.0f}% — 변동성 축소, 방향 결정 임박",
            {"card_type": "bb_squeeze", "bw_pct": round(pct * 100)},
        )
    was_squeezed = len(valid) >= 6 and float((valid < bw[-6]).mean()) <= 0.25
    if was_squeezed and cur > bw[-6] * 1.2:
        up = closes[-1] >= mid[-1]
        return SignalResult(
            "bollinger", 0.5 if up else -0.5, "스퀴즈 후 확장",
            f"변동성 축소 뒤 밴드 확장 — {'위' if up else '아래'} 방향으로 이탈 중",
            {"card_type": "bb_expansion", "direction": "up" if up else "down"},
        )
    return SignalResult("bollinger", 0.0, "볼린저 중립", f"밴드폭 백분위 {pct * 100:.0f}%")


# ── 캔들패턴 (지지/저항 자리에서만 유효) ──────────────────


def candle_signal(
    opens: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    levels: list[tuple[float, int]],
    tol: float = 0.015,
) -> SignalResult:
    o, h, l, c = float(opens[-1]), float(highs[-1]), float(lows[-1]), float(closes[-1])
    rng = h - l
    if rng <= 0:
        return SignalResult("candle_pattern", 0.0, "캔들 중립", "판정 불가")
    body = abs(c - o)
    upper = h - max(o, c)
    lower = min(o, c) - l
    prev_move = closes[-1] - closes[-6] if len(closes) >= 6 else 0.0

    name, score = "캔들 중립", 0.0
    if lower >= 2 * body and upper <= body:
        name, score = "망치형(반등 시도)", 0.55
    elif upper >= 2 * body and lower <= body:
        name, score = "역망치/유성형(상승 저항)", -0.55
    elif body <= 0.1 * rng:
        name, score = "도지(방향 고민)", 0.3 if prev_move < 0 else -0.3
    elif len(closes) >= 2:
        prev_body = abs(float(closes[-2]) - float(opens[-2]))
        if body > prev_body * 1.2:
            if c > o and closes[-2] < opens[-2]:
                name, score = "상승 장악형", 0.6
            elif c < o and closes[-2] > opens[-2]:
                name, score = "하락 장악형", -0.6

    if score == 0.0:
        return SignalResult("candle_pattern", 0.0, name, "특이 패턴 없음")

    near_sr = any(abs(c - lv) / lv <= tol for lv, _ in levels)
    if not near_sr:
        return SignalResult(
            "candle_pattern", score * 0.2, name + " (허공)",
            "지지/저항 자리가 아니라 신뢰도 낮음 — 참고만",
            {"card_type": "candle_pattern", "near_sr": False},
        )
    return SignalResult(
        "candle_pattern", score, name,
        "지지/저항 부근에서 출현 — 반전 신호로 유효",
        {"card_type": "candle_pattern", "near_sr": True},
    )


# ── RSI 다이버전스 ───────────────────────────────────────


def rsi_divergence_signal(closes: np.ndarray, lookback: int = 60) -> SignalResult:
    if len(closes) < lookback:
        return SignalResult("rsi_divergence", 0.0, "다이버전스 없음", "데이터 부족")
    seg = closes[-lookback:]
    r = calc_rsi(closes, 14)[-lookback:]
    hi = [i for i in find_swings(seg, 3, True) if not np.isnan(r[i])]
    lo = [i for i in find_swings(seg, 3, False) if not np.isnan(r[i])]
    if len(hi) >= 2 and hi[-1] >= lookback - 12:
        a, b = hi[-2], hi[-1]
        if seg[b] > seg[a] and r[b] < r[a] - 2:
            return SignalResult(
                "rsi_divergence", -0.6, "약세 다이버전스",
                "주가는 고점을 높였는데 RSI는 낮아짐 — 상승 동력 약화 신호",
                {"card_type": "rsi_divergence"},
            )
    if len(lo) >= 2 and lo[-1] >= lookback - 12:
        a, b = lo[-2], lo[-1]
        if seg[b] < seg[a] and r[b] > r[a] + 2:
            return SignalResult(
                "rsi_divergence", 0.6, "강세 다이버전스",
                "주가는 저점을 낮췄는데 RSI는 높아짐 — 하락 동력 약화 신호",
                {"card_type": "rsi_divergence"},
            )
    return SignalResult("rsi_divergence", 0.0, "다이버전스 없음", "가격-RSI 방향 일치")


# ── 멀티 컨펌 ────────────────────────────────────────────

_CONFIRM_KEYS = {
    "volume", "sr_level", "fake_breakout", "trend_channel", "channel_break",
    "arrangement", "cross_5_20", "cross_20_60", "cross_60_120",
    "candle_pattern", "rsi_divergence", "bollinger",
}


def multi_confirm_signal(signals: list[SignalResult]) -> SignalResult:
    """서로 다른 계열의 신호가 같은 방향을 가리키면 가산점 (멀티 컨펌)."""
    bull = {s.key for s in signals if s.key in _CONFIRM_KEYS and s.score >= 0.3}
    bear = {s.key for s in signals if s.key in _CONFIRM_KEYS and s.score <= -0.3}
    n, direction = (len(bull), 1) if len(bull) >= len(bear) else (len(bear), -1)
    if n < 3:
        return SignalResult("multi_confirm", 0.0, "멀티 컨펌 없음",
                            f"동방향 신호 {n}개 — 3개 이상일 때 가산")
    score = direction * min(1.0, 0.4 + (n - 3) * 0.2)
    word = "상방" if direction > 0 else "하방"
    return SignalResult(
        "multi_confirm", score, f"멀티 컨펌 {n}개({word})",
        f"거래량·지지저항·추세 등 서로 다른 {n}개 신호가 {word}으로 일치",
        {"card_type": "multi_confirm", "count": n},
    )
