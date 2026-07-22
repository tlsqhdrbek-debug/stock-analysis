"""한국투자증권 KIS OpenAPI 비동기 클라이언트.

보안 규칙 (ADR-1):
- 조회(읽기 전용) TR만 화이트리스트로 허용. 주문·정정·취소 TR은 구현 금지.
- 앱키/시크릿은 .env에서만 읽는다.

레이트리밋: 초당 20건 제한 → 세마포어 15로 여유있게 제한, 429/EGW00201 시 지수백오프.
토큰: 24h 유효, backend/.cache/kis_token.json에 캐시. 재발급은 1분 1회 제한이 있어
      만료 1시간 전까지는 무조건 캐시 재사용.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from src.config import CACHE_DIR, get_settings

# 조회 전용 TR ID 화이트리스트 — 이외의 TR은 호출 자체를 차단한다.
ALLOWED_TR_IDS = frozenset(
    {
        "FHKST01010100",  # 주식현재가 시세
        "FHKST03010100",  # 국내주식 기간별시세 (일/주/월/년)
        "FHKST03010200",  # 주식당일분봉조회
        "FHKST03010230",  # 주식일별분봉조회
        "CTPF1002R",      # 상품기본조회 (종목명)
    }
)

TOKEN_CACHE_FILE = CACHE_DIR / "kis_token.json"
_MAX_RETRIES = 4


class KISError(RuntimeError):
    pass


class KISClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = httpx.AsyncClient(
            base_url=self._settings.kis_base_url, timeout=10.0
        )
        self._sem = asyncio.Semaphore(15)
        self._token_lock = asyncio.Lock()
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    async def aclose(self) -> None:
        await self._client.aclose()

    # ── 토큰 ──────────────────────────────────────────────

    async def _get_token(self) -> str:
        now = time.time()
        if self._token and now < self._token_expires_at - 3600:
            return self._token

        async with self._token_lock:
            # 락 대기 중 다른 코루틴이 갱신했을 수 있음
            if self._token and time.time() < self._token_expires_at - 3600:
                return self._token

            cached = self._load_token_cache()
            if cached:
                self._token, self._token_expires_at = cached
                if time.time() < self._token_expires_at - 3600:
                    return self._token

            resp = await self._client.post(
                "/oauth2/tokenP",
                json={
                    "grant_type": "client_credentials",
                    "appkey": self._settings.kis_app_key,
                    "appsecret": self._settings.kis_app_secret,
                },
            )
            body = resp.json()
            if resp.status_code != 200 or "access_token" not in body:
                raise KISError(
                    f"토큰 발급 실패 ({resp.status_code}): "
                    f"{body.get('error_description') or body.get('msg1') or body}"
                )
            self._token = body["access_token"]
            self._token_expires_at = time.time() + int(body.get("expires_in", 86400))
            self._save_token_cache()
            return self._token

    def _load_token_cache(self) -> tuple[str, float] | None:
        try:
            data = json.loads(TOKEN_CACHE_FILE.read_text(encoding="utf-8"))
            if data.get("env") != self._settings.kis_env:
                return None
            return data["token"], float(data["expires_at"])
        except (OSError, ValueError, KeyError):
            return None

    def _save_token_cache(self) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        TOKEN_CACHE_FILE.write_text(
            json.dumps(
                {
                    "env": self._settings.kis_env,
                    "token": self._token,
                    "expires_at": self._token_expires_at,
                }
            ),
            encoding="utf-8",
        )

    # ── 공통 GET ──────────────────────────────────────────

    async def _get(self, path: str, tr_id: str, params: dict[str, str]) -> dict[str, Any]:
        if tr_id not in ALLOWED_TR_IDS:
            raise KISError(f"차단된 TR ID: {tr_id} — 조회 전용 화이트리스트 외 호출 금지 (ADR-1)")

        token = await self._get_token()
        headers = {
            "authorization": f"Bearer {token}",
            "appkey": self._settings.kis_app_key,
            "appsecret": self._settings.kis_app_secret,
            "tr_id": tr_id,
            "custtype": "P",
        }

        delay = 0.5
        for attempt in range(_MAX_RETRIES):
            async with self._sem:
                resp = await self._client.get(path, headers=headers, params=params)
            if resp.status_code == 429:
                await asyncio.sleep(delay)
                delay *= 2
                continue
            body = resp.json()
            # EGW00201: 초당 거래건수 초과
            if body.get("msg_cd") == "EGW00201":
                await asyncio.sleep(delay)
                delay *= 2
                continue
            if resp.status_code != 200 or body.get("rt_cd") not in (None, "0"):
                raise KISError(
                    f"{tr_id} 실패 ({resp.status_code}): {body.get('msg1') or body}"
                )
            return body
        raise KISError(f"{tr_id} 재시도 {_MAX_RETRIES}회 초과 (rate limit)")

    # ── 시세 조회 ─────────────────────────────────────────

    async def inquire_price(self, ticker: str) -> dict[str, Any]:
        """주식현재가 시세. output: 현재가·등락·고저·거래량·시총·업종·시장구분."""
        body = await self._get(
            "/uapi/domestic-stock/v1/quotations/inquire-price",
            "FHKST01010100",
            {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker},
        )
        return body["output"]

    async def inquire_daily_candles(
        self, ticker: str, count: int = 320
    ) -> list[dict[str, Any]]:
        """일봉 조회 (수정주가). 100개/호출 제한 → 날짜 페이징으로 count개 이상 수집.

        반환: 과거→최신 순 [{date, open, high, low, close, volume}].
        """
        end = date.today()
        rows: list[dict[str, Any]] = []
        for _ in range(8):  # 안전 상한 (8×100 = 800일)
            start = end - timedelta(days=200)  # 거래일 100개 ≈ 달력일 145일, 여유
            body = await self._get(
                "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
                "FHKST03010100",
                {
                    "FID_COND_MRKT_DIV_CODE": "J",
                    "FID_INPUT_ISCD": ticker,
                    "FID_INPUT_DATE_1": start.strftime("%Y%m%d"),
                    "FID_INPUT_DATE_2": end.strftime("%Y%m%d"),
                    "FID_PERIOD_DIV_CODE": "D",
                    "FID_ORG_ADJ_PRC": "0",  # 0: 수정주가
                },
            )
            batch = [r for r in body.get("output2", []) if r.get("stck_bsop_date")]
            if not batch:
                break
            rows.extend(batch)
            if len(rows) >= count:
                break
            oldest = min(r["stck_bsop_date"] for r in batch)
            end = datetime.strptime(oldest, "%Y%m%d").date() - timedelta(days=1)

        # 중복 제거 후 과거→최신 정렬
        seen: dict[str, dict[str, Any]] = {}
        for r in rows:
            seen[r["stck_bsop_date"]] = r
        ordered = sorted(seen.values(), key=lambda r: r["stck_bsop_date"])
        return [
            {
                "date": r["stck_bsop_date"],
                "open": float(r["stck_oprc"]),
                "high": float(r["stck_hgpr"]),
                "low": float(r["stck_lwpr"]),
                "close": float(r["stck_clpr"]),
                "volume": int(r["acml_vol"]),
            }
            for r in ordered
        ][-count:]

    async def search_stock_info(self, ticker: str) -> dict[str, Any]:
        """상품기본조회 — 종목명 등. (실전서버 전용 TR)"""
        body = await self._get(
            "/uapi/domestic-stock/v1/quotations/search-stock-info",
            "CTPF1002R",
            {"PDNO": ticker, "PRDT_TYPE_CD": "300"},
        )
        return body["output"]
