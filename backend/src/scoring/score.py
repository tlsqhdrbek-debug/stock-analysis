"""확률 산출. 순수 함수.

상방 확률 = sigmoid(k × Σ(score_i × weight_i))
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

from src.config import CONFIG_DIR
from src.signals.evaluate import SignalResult


@dataclass
class Contribution:
    key: str
    label: str
    desc: str
    score: float        # [-1, +1]
    weight: float
    contribution: float  # score × weight


@dataclass
class ScoreResult:
    up_probability: float    # 0~100
    down_probability: float
    total: float             # 가중합 (시그모이드 이전)
    breakdown: list[Contribution]


@lru_cache
def load_weights(path: str | None = None) -> dict:
    p = Path(path) if path else CONFIG_DIR / "weights.yaml"
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def compute_probability(
    signals: list[SignalResult], weights_config: dict | None = None
) -> ScoreResult:
    cfg = weights_config or load_weights()
    weights: dict[str, float] = cfg["weights"]
    k: float = float(cfg.get("sigmoid_k", 2.5))

    breakdown: list[Contribution] = []
    total = 0.0
    for sig in signals:
        w = weights.get(sig.key, 0.0)
        contrib = sig.score * w
        total += contrib
        breakdown.append(
            Contribution(sig.key, sig.label, sig.desc, sig.score, w, contrib)
        )

    up = 1.0 / (1.0 + math.exp(-k * total)) * 100.0
    breakdown.sort(key=lambda c: abs(c.contribution), reverse=True)
    return ScoreResult(
        up_probability=round(up, 1),
        down_probability=round(100.0 - up, 1),
        total=round(total, 4),
        breakdown=breakdown,
    )
