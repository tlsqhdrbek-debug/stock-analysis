"""신호 판정. 전부 순수 함수 — 입력은 시계열 배열, 출력은 SignalResult 목록.

각 신호의 score는 [-1, +1]: 양수=상방, 음수=하방.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from src.indicators import macd as calc_macd
from src.indicators import rsi as calc_rsi
from src.indicators import sma

MA_PERIODS = [5, 10, 20, 60, 120, 200]
CROSS_PAIRS = [(5, 20), (20, 60), (60, 120)]


@dataclass
class SignalResult:
    key: str                 # weights.yaml의 가중치 키
    score: float             # [-1, +1]
    label: str               # 사람이 읽는 이름
    desc: str                # 근거 문장
    meta: dict[str, Any] = field(default_factory=dict)


def compute_mas(closes: np.ndarray) -> dict[int, np.ndarray]:
    return {p: sma(closes, p) for p in MA_PERIODS}


# ── 배열 판정 ─────────────────────────────────────────────


def arrangement_signal(mas: dict[int, np.ndarray]) -> SignalResult:
    """정배열/역배열/혼조. 인접 쌍 6개 중 순방향 비율로 부분점수."""
    last = {p: mas[p][-1] for p in MA_PERIODS}
    if any(np.isnan(v) for v in last.values()):
        # 데이터 부족 (200일 미만) — 있는 것만으로 판정
        avail = [p for p in MA_PERIODS if not np.isnan(last[p])]
    else:
        avail = MA_PERIODS
    if len(avail) < 3:
        return SignalResult("arrangement", 0.0, "배열 판정 불가", "데이터 부족")

    pairs = list(zip(avail[:-1], avail[1:]))
    bull_pairs = sum(1 for a, b in pairs if last[a] > last[b])
    ratio = bull_pairs / len(pairs)          # 1.0=완전 정배열, 0.0=완전 역배열
    score = ratio * 2.0 - 1.0

    if ratio == 1.0:
        streak = _arrangement_streak(mas, avail, bull=True)
        return SignalResult(
            "arrangement", 1.0, "정배열",
            f"{'>'.join(str(p) for p in avail)} 정배열 {streak}일차",
            {"state": "perfect_bull", "streak": streak},
        )
    if ratio == 0.0:
        streak = _arrangement_streak(mas, avail, bull=False)
        return SignalResult(
            "arrangement", -1.0, "역배열",
            f"{'<'.join(str(p) for p in avail)} 역배열 {streak}일차",
            {"state": "perfect_bear", "streak": streak},
        )
    return SignalResult(
        "arrangement", score, "혼조 배열",
        f"이평선 {len(pairs)}쌍 중 {bull_pairs}쌍 상방 배열",
        {"state": "mixed", "streak": 0},
    )


def _arrangement_streak(
    mas: dict[int, np.ndarray], periods: list[int], bull: bool
) -> int:
    n = len(mas[periods[0]])
    streak = 0
    for i in range(n - 1, -1, -1):
        vals = [mas[p][i] for p in periods]
        if any(np.isnan(v) for v in vals):
            break
        ok = all(
            (a > b) if bull else (a < b) for a, b in zip(vals[:-1], vals[1:])
        )
        if not ok:
            break
        streak += 1
    return streak


# ── 크로스 판정 ───────────────────────────────────────────


def cross_signals(
    mas: dict[int, np.ndarray],
    volumes: np.ndarray,
    lookback: int = 30,
    decay_days: int = 30,
    volume_multiplier: float = 1.3,
) -> list[SignalResult]:
    """골든/데드크로스. 최근 lookback일 내 발생분만, 경과일 선형 감쇠.

    거래량 동반(크로스 당일 거래량 > 20일 평균) 시 신뢰도 가중.
    """
    results = []
    vol_ma20 = sma(volumes.astype(np.float64), 20)
    for fast_p, slow_p in CROSS_PAIRS:
        fast, slow = mas[fast_p], mas[slow_p]
        diff = fast - slow
        cross_idx, cross_type = None, None
        n = len(diff)
        for i in range(max(1, n - lookback), n):
            if np.isnan(diff[i - 1]) or np.isnan(diff[i]):
                continue
            if diff[i - 1] <= 0 < diff[i]:
                cross_idx, cross_type = i, "golden"
            elif diff[i - 1] >= 0 > diff[i]:
                cross_idx, cross_type = i, "dead"
        if cross_idx is None:
            continue

        days_ago = n - 1 - cross_idx
        decay = max(0.0, 1.0 - days_ago / decay_days)
        base = decay if cross_type == "golden" else -decay

        vol_confirmed = (
            not np.isnan(vol_ma20[cross_idx])
            and volumes[cross_idx] > vol_ma20[cross_idx]
        )
        if vol_confirmed:
            base = float(np.clip(base * volume_multiplier, -1.0, 1.0))

        kind = "골든크로스" if cross_type == "golden" else "데드크로스"
        results.append(
            SignalResult(
                f"cross_{fast_p}_{slow_p}",
                base,
                f"{fast_p}-{slow_p} {kind}",
                f"{days_ago}일 전 발생"
                + (", 거래량 동반" if vol_confirmed else ""),
                {
                    "pair": f"{fast_p}-{slow_p}",
                    "type": cross_type,
                    "days_ago": days_ago,
                    "volume_confirmed": vol_confirmed,
                },
            )
        )
    return results


# ── 200일선 앵커 / 이격도 ────────────────────────────────


def ma200_anchor_signal(closes: np.ndarray, mas: dict[int, np.ndarray]) -> SignalResult:
    ma200 = mas[200][-1]
    if np.isnan(ma200):
        return SignalResult("ma200_anchor", 0.0, "200일선 판정 불가", "데이터 부족")
    above = closes[-1] > ma200
    return SignalResult(
        "ma200_anchor",
        1.0 if above else -1.0,
        "200일선 " + ("상회" if above else "하회"),
        f"장기 추세 앵커 {'위' if above else '아래'} (200일선 {ma200:,.0f})",
        {"above": above, "ma200": float(ma200)},
    )


def disparity_signal(closes: np.ndarray, mas: dict[int, np.ndarray]) -> SignalResult:
    """200일선 이격도. ±5% 이내 중립, +5~10% 과열 경고, +10%↑ 강한 과열(하방 점수).
    음의 이격은 대칭으로 침체(상방 반등 점수 소폭)."""
    ma200 = mas[200][-1]
    if np.isnan(ma200) or ma200 <= 0:
        return SignalResult("disparity", 0.0, "이격도 판정 불가", "데이터 부족")
    disp = (closes[-1] / ma200 - 1.0) * 100.0
    if disp > 10:
        score, label = -0.8, "이격 과열(강)"
    elif disp > 5:
        score, label = -0.4, "이격 과열"
    elif disp < -10:
        score, label = 0.5, "이격 침체(반등 여지)"
    elif disp < -5:
        score, label = 0.25, "이격 확대(하방)"
    else:
        score, label = 0.0, "이격 중립"
    return SignalResult(
        "disparity", score, label,
        f"200일선 이격도 {disp:+.1f}%",
        {"disparity_pct": round(disp, 2)},
    )


def support_signal(
    closes: np.ndarray, lows: np.ndarray, mas: dict[int, np.ndarray],
    lookback: int = 15, tol: float = 0.015,
) -> SignalResult:
    """주요 이평선(20/60/120) 지지 테스트. 최근 lookback일 중
    저가가 이평선 ±tol 이내 접근 후 종가가 이평선 위로 마감한 횟수."""
    best_period, best_touches = None, 0
    for p in (20, 60, 120):
        ma_arr = mas[p]
        touches = 0
        for i in range(max(0, len(closes) - lookback), len(closes)):
            if np.isnan(ma_arr[i]) or ma_arr[i] <= 0:
                continue
            near = abs(lows[i] / ma_arr[i] - 1.0) <= tol
            if near and closes[i] >= ma_arr[i]:
                touches += 1
        if touches > best_touches:
            best_period, best_touches = p, touches
    if best_period is None or best_touches == 0:
        return SignalResult("support", 0.0, "지지 테스트 없음", "최근 이평선 접촉 없음")
    score = min(1.0, best_touches / 3.0)
    return SignalResult(
        "support", score,
        f"{best_period}일선 지지",
        f"{best_period}일선({mas[best_period][-1]:,.0f}) 지지 {best_touches}회 확인",
        {"period": best_period, "touches": best_touches},
    )


# ── 보조 지표 ─────────────────────────────────────────────


def volume_signal(volumes: np.ndarray) -> SignalResult:
    vol_ma20 = sma(volumes.astype(np.float64), 20)
    if np.isnan(vol_ma20[-1]) or vol_ma20[-1] <= 0:
        return SignalResult("volume", 0.0, "거래량 판정 불가", "데이터 부족")
    ratio = volumes[-1] / vol_ma20[-1]
    pct = (ratio - 1.0) * 100.0
    score = float(np.clip((ratio - 1.0), -0.6, 0.6))
    label = "거래량 증가" if ratio > 1.1 else "거래량 감소" if ratio < 0.9 else "거래량 보통"
    return SignalResult(
        "volume", score, label,
        f"20일 평균 대비 {pct:+.0f}%",
        {"ratio": round(ratio, 2)},
    )


def rsi_signal(closes: np.ndarray) -> SignalResult:
    r = calc_rsi(closes, 14)
    val = r[-1]
    if np.isnan(val):
        return SignalResult("rsi", 0.0, "RSI 판정 불가", "데이터 부족")
    if val >= 70:
        score, label = -0.7, "RSI 과매수권"
    elif val <= 30:
        score, label = 0.7, "RSI 과매도권"
    else:
        score, label = float((50.0 - val) / 50.0 * 0.2), "RSI 중립"
    return SignalResult(
        "rsi", score, label, f"일봉 RSI {val:.1f}", {"rsi": round(float(val), 1)}
    )


def macd_signal(closes: np.ndarray) -> SignalResult:
    _, _, hist = calc_macd(closes)
    if len(hist) < 2 or np.isnan(hist[-1]):
        return SignalResult("macd", 0.0, "MACD 판정 불가", "데이터 부족")
    cur = hist[-1]
    rising = not np.isnan(hist[-2]) and cur > hist[-2]
    if cur > 0:
        score = 0.6 if rising else 0.3
        label = "MACD 상방" + (" 확산" if rising else " 유지")
    else:
        score = -0.6 if not rising else -0.3
        label = "MACD 하방" + (" 확산" if not rising else " 축소")
    return SignalResult(
        "macd", score, label,
        f"히스토그램 {cur:+.0f}, {'확대' if rising else '축소'} 중",
        {"histogram": float(cur), "rising": bool(rising)},
    )


# ── 종합 ─────────────────────────────────────────────────


def evaluate_daily(
    closes: np.ndarray,
    lows: np.ndarray,
    volumes: np.ndarray,
    cross_lookback: int = 30,
    cross_decay_days: int = 30,
    volume_multiplier: float = 1.3,
) -> list[SignalResult]:
    """일봉 기준 전체 신호 판정."""
    mas = compute_mas(closes)
    results = [
        arrangement_signal(mas),
        ma200_anchor_signal(closes, mas),
        disparity_signal(closes, mas),
        support_signal(closes, lows, mas),
        volume_signal(volumes),
        rsi_signal(closes),
        macd_signal(closes),
    ]
    results.extend(
        cross_signals(
            mas, volumes,
            lookback=cross_lookback,
            decay_days=cross_decay_days,
            volume_multiplier=volume_multiplier,
        )
    )
    return results
