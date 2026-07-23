"""분석 응답 조립 — KIS 데이터 + 신호 + 스코어 → AnalyzeResponse.

주의: 매수/매도 추천 문구 금지. 확률·근거·상태 서술만.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

from src.macro.sectors import macro_reasons
from src.schemas import (
    AnalyzeResponse,
    Candle,
    ChartData,
    Chip,
    MAStatusItem,
    NewsItem,
    Probability,
    Reason,
    ReasonGroup,
    Signal,
    TimeframeMAStatus,
)
from src.scoring.score import ScoreResult, compute_probability, load_weights
from src.signals.evaluate import MA_PERIODS, SignalResult, compute_mas, evaluate_daily

KST = timezone(timedelta(hours=9))

_SIGNAL_TYPE = {
    "arrangement": "perfect_alignment",
    "ma200_anchor": "support",
    "disparity": "overheated",
    "support": "support",
    "volume": "volume_surge",
    "rsi": "overheated",
    "macd": "volume_surge",
}


def build_response(
    ticker: str,
    price_info: dict,
    candles: list[dict],
    name: str,
    sector: str | None,
    news: list["NewsItem"] | None = None,
) -> AnalyzeResponse:
    closes = np.array([c["close"] for c in candles], dtype=np.float64)
    lows = np.array([c["low"] for c in candles], dtype=np.float64)
    opens = np.array([c["open"] for c in candles], dtype=np.float64)
    highs = np.array([c["high"] for c in candles], dtype=np.float64)
    volumes = np.array([c["volume"] for c in candles], dtype=np.float64)

    cfg = load_weights()
    signals = evaluate_daily(
        closes,
        lows,
        volumes,
        cross_lookback=int(cfg.get("cross_decay_days", 30)),
        cross_decay_days=int(cfg.get("cross_decay_days", 30)),
        volume_multiplier=float(cfg.get("volume_confirm_multiplier", 1.3)),
        opens=opens,
        highs=highs,
    )
    score = compute_probability(signals, cfg)

    current_price = float(price_info["stck_prpr"])
    mas = compute_mas(closes)

    ma_status_daily = _ma_status(mas, current_price, signals)
    # TODO(step 9): min240/min60은 분봉 조회 후 교체. 지금은 일봉 값 복제(placeholder).
    ma_status = {
        "daily": ma_status_daily,
        "min240": ma_status_daily,
        "min60": ma_status_daily,
    }

    active = _active_signals(signals, cfg)
    bull_tech, bear_tech = _technical_reasons(score)
    bull_macro, bear_macro = macro_reasons(sector)
    summary, summary_sub = _summary(signals, score, mas, current_price)

    return AnalyzeResponse(
        ticker=ticker,
        name=name,
        market=price_info.get("rprs_mrkt_kor_name", "KOSPI"),
        sector=sector or price_info.get("bstp_kor_isnm"),
        current_price=current_price,
        change=float(price_info["prdy_vrss"]),
        change_pct=float(price_info["prdy_ctrt"]),
        high=float(price_info["stck_hgpr"]),
        low=float(price_info["stck_lwpr"]),
        volume=int(price_info["acml_vol"]),
        market_cap=float(price_info["hts_avls"]) * 100_000_000
        if price_info.get("hts_avls")
        else None,
        as_of=datetime.now(KST).isoformat(timespec="seconds"),
        probability=Probability(up=score.up_probability, down=score.down_probability),
        model_confidence=_model_confidence(score),
        horizon="short",
        summary=summary,
        summary_sub=summary_sub,
        chips=_chips(signals),
        ma_status=ma_status,
        active_signals=active,
        bullish_reasons=ReasonGroup(technical=bull_tech, macro=bull_macro),
        bearish_reasons=ReasonGroup(technical=bear_tech, macro=bear_macro),
        news=news or [],
        chart_data=_chart_data(candles, mas),
    )


def _ma_status(
    mas: dict[int, np.ndarray], current_price: float, signals: list[SignalResult]
) -> TimeframeMAStatus:
    arr_sig = next(s for s in signals if s.key == "arrangement")
    items = []
    for p in MA_PERIODS:
        v = mas[p][-1]
        if np.isnan(v):
            continue
        gap = (current_price / v - 1.0) * 100.0
        items.append(
            MAStatusItem(
                label=f"MA {p}",
                period=p,
                price=round(float(v), 0),
                gap_pct=round(gap, 2),
                side="above" if current_price >= v else "below",
            )
        )
    return TimeframeMAStatus(
        ma=items,
        arrangement=arr_sig.meta.get("state", "mixed"),
        arrangement_streak=arr_sig.meta.get("streak", 0),
    )


def _active_signals(signals: list[SignalResult], cfg: dict) -> list[Signal]:
    """|score|가 유의미한 신호만 카드로 노출 (최대 4개)."""
    weights = cfg["weights"]
    scored = [s for s in signals if abs(s.score) >= 0.25 and weights.get(s.key, 0) > 0]
    scored.sort(key=lambda s: abs(s.score) * weights.get(s.key, 0), reverse=True)
    out = []
    today = datetime.now(KST).strftime("%Y.%m.%d")
    for s in scored[:4]:
        sig_type = s.meta.get("card_type") or _SIGNAL_TYPE.get(s.key)
        if s.key.startswith("cross_"):
            sig_type = "golden_cross" if s.score > 0 else "dead_cross"
        out.append(
            Signal(
                type=sig_type or "perfect_alignment",
                pair=s.meta.get("pair"),
                name=s.label,
                desc=s.desc,
                direction="bull" if s.score > 0 else "bear",
                confidence=int(round(abs(s.score) * 100)),
                date=today,
                weight=round(abs(s.score) * weights.get(s.key, 0) * 100, 1),
            )
        )
    return out


def _technical_reasons(score: ScoreResult) -> tuple[list[Reason], list[Reason]]:
    bulls, bears = [], []
    for c in score.breakdown:
        if abs(c.contribution) < 0.005:
            continue
        reason = Reason(
            title=c.label,
            desc=c.desc,
            weight=round(abs(c.contribution) * 100, 1),
        )
        (bulls if c.contribution > 0 else bears).append(reason)
    return bulls[:4], bears[:4]


def _chips(signals: list[SignalResult]) -> list[Chip]:
    chips = []
    for s in signals:
        if s.key == "arrangement" and s.meta.get("state") == "perfect_bull":
            chips.append(Chip(label="정배열", tone="bull"))
        elif s.key == "arrangement" and s.meta.get("state") == "perfect_bear":
            chips.append(Chip(label="역배열", tone="bear"))
        elif s.key.startswith("cross_") and s.score > 0.3:
            chips.append(Chip(label="골든크로스", tone="bull"))
        elif s.key.startswith("cross_") and s.score < -0.3:
            chips.append(Chip(label="데드크로스", tone="bear"))
        elif s.key == "disparity" and s.score <= -0.4:
            chips.append(Chip(label="과열 주의", tone="warn"))
        elif s.key == "rsi" and s.score <= -0.5:
            chips.append(Chip(label="RSI 과매수", tone="warn"))
        elif s.key == "rsi" and s.score >= 0.5:
            chips.append(Chip(label="RSI 과매도", tone="neutral"))
        elif s.key == "volume" and s.score > 0.2:
            chips.append(Chip(label="거래량 증가", tone="neutral"))
    return chips[:4]


def _summary(
    signals: list[SignalResult],
    score: ScoreResult,
    mas: dict[int, np.ndarray],
    current_price: float,
) -> tuple[str, str]:
    by_key = {s.key: s for s in signals}
    parts = []
    arr = by_key["arrangement"]
    if arr.meta.get("state") == "perfect_bull":
        parts.append("정배열 유지")
    elif arr.meta.get("state") == "perfect_bear":
        parts.append("역배열 지속")
    else:
        parts.append("이평선 혼조 배열")
    sup = by_key.get("support")
    if sup and sup.score > 0:
        parts.append(f"{sup.meta['period']}일선 지지 확인")
    for s in signals:
        if s.key.startswith("cross_") and abs(s.score) >= 0.3:
            kind = "골든크로스" if s.score > 0 else "데드크로스"
            parts.append(f"{s.meta['pair']} {kind} " + ("발생" if s.meta["days_ago"] <= 5 else "이후 진행"))
            break
    summary = ", ".join(parts[:3]) + "."

    sub_parts = []
    disp = by_key.get("disparity")
    if disp and disp.meta.get("disparity_pct") is not None:
        d = disp.meta["disparity_pct"]
        if d > 5:
            sub_parts.append(f"200일선 이격도가 {d:+.1f}%로 확대되어 과열 부담이 존재합니다")
        elif d < -5:
            sub_parts.append(f"200일선 이격도가 {d:+.1f}%로 침체 구간입니다")
    rsi_s = by_key.get("rsi")
    if rsi_s and rsi_s.meta.get("rsi"):
        sub_parts.append(f"일봉 RSI {rsi_s.meta['rsi']}")
    direction = "상방" if score.up_probability >= 50 else "하방"
    sub_parts.append(
        f"종합 가중 스코어 기준 {direction} 확률 {max(score.up_probability, score.down_probability):.0f}%"
    )
    return summary, ". ".join(sub_parts) + "."


def _model_confidence(score: ScoreResult) -> int:
    """신호 합의 정도로 신뢰도 1~5. 기여도 방향 일치 비율 기반."""
    meaningful = [c for c in score.breakdown if abs(c.contribution) >= 0.01]
    if len(meaningful) < 2:
        return 2
    same = sum(1 for c in meaningful if (c.contribution > 0) == (score.total > 0))
    ratio = same / len(meaningful)
    return max(1, min(5, int(round(1 + ratio * 4))))


def _iso_time(c: dict) -> str:
    d = c["date"]
    hh, mm = (c["time"][:2], c["time"][2:4]) if "time" in c else ("00", "00")
    return f"{d[:4]}-{d[4:6]}-{d[6:]}T{hh}:{mm}:00+09:00"


def chart_payload(candles: list[dict], tail: int | None = 120) -> ChartData:
    """캔들 목록(일/주/월/분봉 공용) → ChartData. MA는 전체 구간으로 계산 후 슬라이스."""
    closes = np.array([c["close"] for c in candles], dtype=np.float64)
    mas = compute_mas(closes)
    sliced = candles[-tail:] if tail else candles
    offset = len(candles) - len(sliced)
    ma_out: dict[str, list[float | None]] = {}
    for p in MA_PERIODS:
        arr = mas[p][offset:]
        ma_out[str(p)] = [None if np.isnan(v) else round(float(v), 1) for v in arr]
    return ChartData(
        candles=[
            Candle(t=_iso_time(c), o=c["open"], h=c["high"], l=c["low"], c=c["close"], v=c["volume"])
            for c in sliced
        ],
        ma=ma_out,
    )


def _chart_data(candles: list[dict], mas: dict[int, np.ndarray]) -> ChartData:
    return chart_payload(candles, tail=120)
