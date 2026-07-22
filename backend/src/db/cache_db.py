"""PostgreSQL(Supabase) 분석 캐시 — 개발 순서 10단계.

- Supabase transaction-mode pooler(6543, pgbouncer) 경유 → psycopg async 사용.
  URL의 ?pgbouncer=true 등 비표준 파라미터는 제거하고 sslmode=require 강제.
- TTL은 data/cache.py의 장 상태 인지형 정책 재사용 (장중 5분/장외 60분).
- 연결 실패 시 호출부(main.py)가 in-memory 캐시로 폴백한다.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from src.data.cache import current_ttl

_DDL = """
CREATE TABLE IF NOT EXISTS analysis_cache (
    ticker text PRIMARY KEY,
    payload jsonb NOT NULL,
    expires_at timestamptz NOT NULL
)
"""


def _clean_conninfo(url: str) -> str:
    """pgbouncer 등 libpq가 모르는 쿼리 파라미터 제거 + sslmode=require."""
    parts = urlsplit(url.strip().strip('"'))
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, "sslmode=require", "")
    )


class DBCache:
    """단일 async 커넥션 + 자동 재연결. 트래픽이 작아 풀은 불필요."""

    def __init__(self, conninfo: str) -> None:
        self._conninfo = conninfo
        self._conn: AsyncConnection | None = None

    @classmethod
    async def create(cls, database_url: str) -> "DBCache":
        self = cls(_clean_conninfo(database_url))
        conn = await self._connect()
        await conn.execute(_DDL)
        return self

    async def _connect(self) -> AsyncConnection:
        if self._conn is None or self._conn.closed:
            # pgbouncer transaction 모드: prepared statement 캐시 금지
            self._conn = await AsyncConnection.connect(
                self._conninfo, autocommit=True, prepare_threshold=None
            )
        return self._conn

    async def get(self, ticker: str) -> dict[str, Any] | None:
        try:
            conn = await self._connect()
            cur = await conn.execute(
                "SELECT payload FROM analysis_cache"
                " WHERE ticker = %s AND expires_at > now()",
                (ticker,),
            )
            row = await cur.fetchone()
        except Exception:
            return None  # DB 장애 시 캐시 미스로 처리 (graceful degradation)
        if row is None:
            return None
        payload = row[0]
        return payload if isinstance(payload, dict) else json.loads(payload)

    async def set(self, ticker: str, payload: dict[str, Any]) -> None:
        try:
            conn = await self._connect()
            await conn.execute(
                """
                INSERT INTO analysis_cache (ticker, payload, expires_at)
                VALUES (%s, %s, now() + make_interval(secs => %s))
                ON CONFLICT (ticker) DO UPDATE
                  SET payload = EXCLUDED.payload,
                      expires_at = EXCLUDED.expires_at
                """,
                (ticker, Jsonb(payload), current_ttl()),
            )
        except Exception:
            pass  # 저장 실패는 치명적이지 않음 — 다음 요청이 재계산

    async def aclose(self) -> None:
        if self._conn is not None and not self._conn.closed:
            await self._conn.close()
