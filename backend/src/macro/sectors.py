"""섹터 → 매크로 근거 문장 매핑 (Phase 1: sectors.yaml 정적)."""

from __future__ import annotations

from functools import lru_cache

import yaml

from src.config import CONFIG_DIR
from src.schemas import Reason


@lru_cache
def _load() -> dict:
    return yaml.safe_load((CONFIG_DIR / "sectors.yaml").read_text(encoding="utf-8"))


def macro_reasons(sector: str | None) -> tuple[list[Reason], list[Reason]]:
    """반환: (상방 매크로, 하방 매크로)."""
    data = _load()
    entry = data.get(sector or "", None) or data["default"]
    bulls = [Reason(**r) for r in entry.get("bull", [])]
    bears = [Reason(**r) for r in entry.get("bear", [])]
    return bulls, bears
