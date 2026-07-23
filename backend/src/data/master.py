"""KIS 종목 마스터파일 — 코스피+코스닥 전 종목 검색용.

공식 마스터파일(kospi_code.mst/kosdaq_code.mst)을 기동 시 내려받아 파싱한다.
파싱 규칙은 koreainvestment/open-trading-api 공식 파서와 동일:
  - 각 행 뒤쪽 고정폭 필드(코스피 228B, 코스닥 222B)를 제외한 앞부분이
    [단축코드 9][표준코드 12][한글명 ...]
하루 1회 .cache/에 캐시하고, 다운로드 실패 시 assets/stocks.csv 폴백.
"""

from __future__ import annotations

import csv
import io
import logging
import zipfile
from datetime import date

import httpx

from src.config import BACKEND_ROOT, CACHE_DIR

logger = logging.getLogger("uvicorn.error")

_MST_URLS = {
    "KOSPI": ("https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip", 228),
    "KOSDAQ": ("https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip", 222),
}
_CACHE_FILE = CACHE_DIR / "stock_master.csv"
_FALLBACK_CSV = BACKEND_ROOT / "assets" / "stocks.csv"


def _parse_mst(text: str, tail: int, market: str) -> list[dict]:
    out = []
    for line in text.splitlines():
        if len(line) <= tail:
            continue
        head = line[: len(line) - tail]
        code = head[0:9].strip()
        name = head[21:].strip()
        group = line[len(line) - tail + 1 : len(line) - tail + 3]
        # ST=주권, RT=리츠, EF=ETF, EN=ETN — 6자리 숫자 코드만
        if len(code) == 6 and code.isdigit() and group in ("ST", "RT", "EF", "EN"):
            out.append({"ticker": code, "name": name, "market": market})
    return out


async def load_master() -> dict[str, dict]:
    """전 종목 마스터 로드. 반환: {ticker: {ticker,name,market,sector?}}"""
    stocks: list[dict] = []

    # 당일 캐시 재사용 (파일 수정일 기준)
    try:
        if (
            _CACHE_FILE.exists()
            and date.fromtimestamp(_CACHE_FILE.stat().st_mtime) == date.today()
        ):
            with open(_CACHE_FILE, encoding="utf-8") as f:
                stocks = list(csv.DictReader(f))
    except OSError:
        stocks = []

    if not stocks:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for market, (url, tail) in _MST_URLS.items():
                    resp = await client.get(url)
                    resp.raise_for_status()
                    zf = zipfile.ZipFile(io.BytesIO(resp.content))
                    raw = zf.read(zf.namelist()[0]).decode("cp949", errors="ignore")
                    stocks.extend(_parse_mst(raw, tail, market))
            if stocks:
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                with open(_CACHE_FILE, "w", encoding="utf-8", newline="") as f:
                    w = csv.DictWriter(f, fieldnames=["ticker", "name", "market"])
                    w.writeheader()
                    w.writerows(stocks)
            logger.info("종목 마스터 로드: %d개", len(stocks))
        except Exception as e:
            logger.warning("마스터 다운로드 실패 → 번들 CSV 폴백: %s", e)

    if not stocks:
        with open(_FALLBACK_CSV, encoding="utf-8") as f:
            stocks = list(csv.DictReader(f))

    master = {s["ticker"]: dict(s) for s in stocks}
    # 섹터 정보는 번들 CSV로 오버레이 (매크로 근거 매핑용)
    try:
        with open(_FALLBACK_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["ticker"] in master:
                    master[row["ticker"]]["sector"] = row["sector"]
                else:
                    master[row["ticker"]] = dict(row)
    except OSError:
        pass
    return master


def search_master(master: dict[str, dict], q: str, limit: int = 20) -> list[dict]:
    needle = q.strip().lower()
    if not needle:
        # 빈 검색 → 번들 CSV의 주요 종목 순서 유지가 없으므로 이름순 상위
        return sorted(master.values(), key=lambda s: s["name"])[:limit]
    starts, contains = [], []
    for s in master.values():
        name = s["name"].lower()
        if name.startswith(needle) or s["ticker"].startswith(needle):
            starts.append(s)
        elif needle in name or needle in s["ticker"]:
            contains.append(s)
        if len(starts) >= limit:
            break
    return (starts + contains)[:limit]
