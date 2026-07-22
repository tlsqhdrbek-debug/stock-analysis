"""FastAPI 앱. 실행: uvicorn src.api.main:app --port 8000"""

from __future__ import annotations

import asyncio
import csv
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.api.report import build_response
from src.config import BACKEND_ROOT, get_settings
from src.data.cache import AnalysisCache
from src.data.kis_client import KISClient, KISError
from src.data.news import fetch_news
from src.db.cache_db import DBCache
from src.schemas import AnalyzeResponse, NewsItem, SearchHit

logger = logging.getLogger("uvicorn.error")
_STOCKS_CSV = BACKEND_ROOT / "assets" / "stocks.csv"


def _load_stock_master() -> dict[str, dict]:
    with open(_STOCKS_CSV, encoding="utf-8") as f:
        return {row["ticker"]: row for row in csv.DictReader(f)}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.kis = KISClient()
    app.state.stocks = _load_stock_master()
    # 캐시: Supabase Postgres 우선, 실패 시 in-memory 폴백 (step 10)
    app.state.db_cache = None
    app.state.mem_cache = AnalysisCache()
    try:
        app.state.db_cache = await DBCache.create(settings.database_url)
        logger.info("분석 캐시: Supabase PostgreSQL 연결됨")
    except Exception as e:
        logger.warning("Supabase 연결 실패 → in-memory 캐시 폴백: %s", e)
    yield
    await app.state.kis.aclose()
    if app.state.db_cache:
        await app.state.db_cache.aclose()


app = FastAPI(title="stock-analysis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "cache": "postgres" if app.state.db_cache else "memory",
    }


async def _cache_get(ticker: str):
    if app.state.db_cache:
        hit = await app.state.db_cache.get(ticker)
        if hit is not None:
            return hit
    return app.state.mem_cache.get(ticker)


async def _cache_set(ticker: str, payload: dict) -> None:
    if app.state.db_cache:
        await app.state.db_cache.set(ticker, payload)
    app.state.mem_cache.set(ticker, payload)


@app.get("/api/analyze/{ticker}", response_model=AnalyzeResponse, response_model_by_alias=True)
async def analyze(ticker: str):
    if not (ticker.isdigit() and len(ticker) == 6):
        raise HTTPException(400, "종목코드는 6자리 숫자입니다")

    cached = await _cache_get(ticker)
    if cached is not None:
        return cached

    settings = get_settings()
    kis: KISClient = app.state.kis

    # 종목명·섹터 결정 (뉴스 검색어로도 사용)
    master = app.state.stocks.get(ticker)
    if master:
        name, sector = master["name"], master["sector"]
    else:
        try:
            info = await kis.search_stock_info(ticker)
            name = info.get("prdt_abrv_name") or ticker
        except KISError:
            name = ticker
        sector = None

    try:
        price_info, candles, news_raw = await asyncio.gather(
            kis.inquire_price(ticker),
            kis.inquire_daily_candles(ticker, count=320),
            fetch_news(name, settings.naver_client_id, settings.naver_client_secret),
        )
    except KISError as e:
        raise HTTPException(502, f"KIS API 오류: {e}") from e

    if not candles:
        raise HTTPException(404, f"시세 데이터 없음: {ticker}")

    news = [NewsItem(**n) for n in news_raw]
    resp = build_response(ticker, price_info, candles, name, sector, news)
    payload = resp.model_dump(by_alias=True)
    await _cache_set(ticker, payload)
    return payload


@app.get("/api/search", response_model=list[SearchHit], response_model_by_alias=True)
async def search(q: str = ""):
    stocks = app.state.stocks
    needle = q.strip().lower()
    hits = [
        SearchHit(ticker=s["ticker"], name=s["name"], market=s["market"])
        for s in stocks.values()
        if not needle or needle in s["name"].lower() or needle in s["ticker"]
    ]
    return hits[:20]
