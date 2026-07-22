"""분석 결과 캐시. Phase 1은 in-memory, step 10에서 PostgreSQL로 교체.

TTL 정책 (ADR-5):
- 장중 (평일 09:00~15:30 KST): 5분
- 장외·주말: 60분
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

KST = timezone(timedelta(hours=9))

TTL_MARKET_OPEN = 5 * 60
TTL_MARKET_CLOSED = 60 * 60


def is_market_open(now: datetime | None = None) -> bool:
    now = now or datetime.now(KST)
    if now.weekday() >= 5:  # 토·일
        return False
    t = now.hour * 60 + now.minute
    return 9 * 60 <= t <= 15 * 60 + 30


def current_ttl() -> int:
    return TTL_MARKET_OPEN if is_market_open() else TTL_MARKET_CLOSED


class AnalysisCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        hit = self._store.get(key)
        if hit is None:
            return None
        expires_at, value = hit
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.time() + current_ttl(), value)
