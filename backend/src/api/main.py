"""FastAPI 앱. 실행: uvicorn src.api.main:app --port 8000"""

from __future__ import annotations

import asyncio
import csv
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.config import BACKEND_ROOT
from src.data.cache import AnalysisCache
from src.data.kis_client import KISClient, KISError
from src.api.report import build_response
from src.schemas import AnalyzeResponse, SearchHit

_STOCKS_CSV = BACKEND_ROOT / "assets" / "stocks.csv"


def _load_stock_master() -> dict[str, dict]:
    with open(_STOCKS_CSV, encoding="utf-8") as f:
        return {row["ticker"]: row for row in csv.DictReader(f)}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.kis = KISClient()
    app.state.cache = AnalysisCache()
    app.state.stocks = _load_stock_master()
    yield
    await app.state.kis.aclose()


app = FastAPI(title="stock-analysis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/analyze/{ticker}", response_model=AnalyzeResponse, response_model_by_alias=True)
async def analyze(ticker: str):
    if not (ticker.isdigit() and len(ticker) == 6):
        raise HTTPException(400, "종목코드는 6자리 숫자입니다")

    cached = app.state.cache.get(ticker)
    if cached is not None:
        return cached

    kis: KISClient = app.state.kis
    try:
        price_info, candles = await asyncio.gather(
            kis.inquire_price(ticker),
            kis.inquire_daily_candles(ticker, count=320),
        )
    except KISError as e:
        raise HTTPException(502, f"KIS API 오류: {e}") from e

    if not candles:
        raise HTTPException(404, f"시세 데이터 없음: {ticker}")

    master = app.state.stocks.get(ticker)
    if master:
        name, sector = master["name"], master["sector"]
    else:
        # 마스터에 없으면 KIS 상품기본조회로 종목명 획득 (graceful degradation)
        try:
            info = await kis.search_stock_info(ticker)
            name = info.get("prdt_abrv_name") or ticker
        except KISError:
            name = ticker
        sector = None

    resp = build_response(ticker, price_info, candles, name, sector)
    app.state.cache.set(ticker, resp)
    return resp


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
