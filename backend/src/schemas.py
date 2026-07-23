"""API 응답 스키마. frontend/src/lib/types.ts와 1:1 유지 (camelCase alias)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class MAStatusItem(CamelModel):
    label: str
    period: int
    price: float
    gap_pct: float
    side: str  # "above" | "below"


class TimeframeMAStatus(CamelModel):
    ma: list[MAStatusItem]
    arrangement: str  # perfect_bull | perfect_bear | mixed
    arrangement_streak: int


class Signal(CamelModel):
    type: str
    pair: str | None = None
    name: str
    desc: str
    direction: str  # bull | bear
    confidence: int
    date: str
    weight: float


class Reason(CamelModel):
    icon: str | None = None
    title: str
    desc: str
    weight: float


class ReasonGroup(CamelModel):
    technical: list[Reason]
    macro: list[Reason]


class NewsItem(CamelModel):
    title: str
    url: str
    date: str
    source: str
    tag: str | None = None
    summary: str | None = None


class Candle(CamelModel):
    t: str
    o: float
    h: float
    l: float
    c: float
    v: int


class ChartData(CamelModel):
    candles: list[Candle]
    ma: dict[str, list[float | None]]


class Probability(CamelModel):
    up: float
    down: float


class Chip(CamelModel):
    label: str
    tone: str  # bull | bear | warn | neutral


class AnalyzeResponse(CamelModel):
    ticker: str
    name: str
    market: str
    sector: str | None = None
    current_price: float
    change: float
    change_pct: float
    high: float
    low: float
    volume: int
    market_cap: float | None = None
    as_of: str

    probability: Probability
    model_confidence: int
    horizon: str

    summary: str
    summary_sub: str
    chips: list[Chip]

    ma_status: dict[str, TimeframeMAStatus]
    active_signals: list[Signal]

    bullish_reasons: ReasonGroup
    bearish_reasons: ReasonGroup

    news: list[NewsItem]
    chart_data: ChartData
    structure: dict | None = None  # 매물대·추세 채널·캔들·볼린저·다이버전스 상태


class SearchHit(CamelModel):
    ticker: str
    name: str
    market: str
