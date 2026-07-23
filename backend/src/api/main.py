"""FastAPI 앱. 실행: uvicorn src.api.main:app --port 8000"""

from __future__ import annotations

import asyncio

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.api.report import build_response, chart_payload
from src.config import get_settings
from src.data.cache import AnalysisCache
from src.data.kis_client import KISClient, KISError
from src.data.llm import LLMError, generate_summary
from src.data.master import load_master, search_master
from src.data.news import fetch_news
from src.data.resample import resample_minutes
from src.db.cache_db import DBCache
from src.schemas import AnalyzeResponse, ChartData, NewsItem, SearchHit

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.kis = KISClient()
    app.state.stocks = await load_master()  # 코스피+코스닥 전 종목
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


async def _get_analysis(ticker: str) -> dict:
    """분석 페이로드 (캐시 우선). analyze·ai-summary 공용."""
    cached = await _cache_get(ticker)
    if cached is not None:
        return cached

    settings = get_settings()
    kis: KISClient = app.state.kis

    # 종목명·섹터 결정 (뉴스 검색어로도 사용)
    master = app.state.stocks.get(ticker)
    if master:
        name, sector = master["name"], master.get("sector")
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
            fetch_news(name, settings.naver_client_id, settings.naver_client_secret, limit=3),
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


@app.get("/api/analyze/{ticker}", response_model=AnalyzeResponse, response_model_by_alias=True)
async def analyze(ticker: str):
    if not (ticker.isdigit() and len(ticker) == 6):
        raise HTTPException(400, "종목코드는 6자리 숫자입니다")
    return await _get_analysis(ticker)


@app.get("/api/ai-summary/{ticker}")
async def ai_summary(ticker: str):
    """gpt-5-mini로 이평선·신호·상방/하방 근거·뉴스를 통합 요약."""
    if not (ticker.isdigit() and len(ticker) == 6):
        raise HTTPException(400, "종목코드는 6자리 숫자입니다")
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY가 설정되지 않았습니다")

    key = f"ai:{ticker}"
    cached = await _cache_get(key)
    if cached is not None:
        return cached

    payload = await _get_analysis(ticker)
    try:
        text = await generate_summary(payload, settings.openai_api_key)
    except LLMError as e:
        raise HTTPException(502, f"AI 요약 실패: {e}") from e

    out = {"ticker": ticker, "model": "gpt-5-mini", "summary": text, "asOf": payload["asOf"]}
    await _cache_set(key, out)
    return out


@app.get("/api/search", response_model=list[SearchHit], response_model_by_alias=True)
async def search(q: str = ""):
    return [
        SearchHit(ticker=s["ticker"], name=s["name"], market=s["market"])
        for s in search_master(app.state.stocks, q)
    ]


_TF_PERIOD = {"D": "D", "W": "W", "M": "M"}
_TF_MINUTES = {"60": 60, "240": 240}


@app.get("/api/candles/{ticker}", response_model=ChartData, response_model_by_alias=True)
async def candles(ticker: str, tf: str = "D"):
    """타임프레임별 차트 데이터. tf: D(일)|W(주)|M(월)|60(60분)|240(240분)."""
    if tf not in _TF_PERIOD and tf not in _TF_MINUTES:
        raise HTTPException(400, "tf는 D|W|M|60|240 중 하나입니다")
    key = f"candles:{ticker}:{tf}"
    cached = app.state.mem_cache.get(key)
    if cached is not None:
        return cached

    kis: KISClient = app.state.kis
    try:
        if tf in _TF_PERIOD:
            rows = await kis.inquire_period_candles(ticker, tf, count=320 if tf == "D" else 160)
            payload = chart_payload(rows, tail=120)
        else:
            # 최근 7거래일 1분봉 → 60/240분 리샘플 (09:00 앵커, ADR-3)
            daily = await kis.inquire_period_candles(ticker, "D", count=10)
            days = [c["date"] for c in daily[-7:]]
            per_day = await asyncio.gather(
                *(kis.inquire_day_minutes(ticker, d) for d in days)
            )
            minutes = [m for day_rows in per_day for m in day_rows]
            if not minutes:
                raise HTTPException(404, "분봉 데이터 없음")
            payload = chart_payload(resample_minutes(minutes, _TF_MINUTES[tf]), tail=None)
    except KISError as e:
        raise HTTPException(502, f"KIS API 오류: {e}") from e

    out = payload.model_dump(by_alias=True)
    app.state.mem_cache.set(key, out)
    return out
