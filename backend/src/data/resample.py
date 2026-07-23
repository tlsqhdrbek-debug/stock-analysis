"""분봉 리샘플 — 순수 함수. 09:00 개장 앵커 (ADR-3)."""

from __future__ import annotations

_OPEN_MIN = 9 * 60  # 09:00


def resample_minutes(
    minutes: list[dict], bar_minutes: int
) -> list[dict]:
    """1분봉 목록(과거→최신, date/time 키) → bar_minutes 봉.

    버킷 = (분단위 시각 - 09:00) // bar_minutes, 일자별로 독립.
    240분봉이면 09:00~13:00 / 13:00~15:30(부분봉) 두 개가 된다.
    """
    buckets: dict[tuple[str, int], dict] = {}
    order: list[tuple[str, int]] = []
    for m in minutes:
        t = m["time"]
        mins = int(t[:2]) * 60 + int(t[2:4])
        idx = max(0, (mins - _OPEN_MIN)) // bar_minutes
        key = (m["date"], idx)
        b = buckets.get(key)
        if b is None:
            start = _OPEN_MIN + idx * bar_minutes
            buckets[key] = {
                "date": m["date"],
                "time": f"{start // 60:02d}{start % 60:02d}00",
                "open": m["open"],
                "high": m["high"],
                "low": m["low"],
                "close": m["close"],
                "volume": m["volume"],
            }
            order.append(key)
        else:
            b["high"] = max(b["high"], m["high"])
            b["low"] = min(b["low"], m["low"])
            b["close"] = m["close"]
            b["volume"] += m["volume"]
    return [buckets[k] for k in order]
