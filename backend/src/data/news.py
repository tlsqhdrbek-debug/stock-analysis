"""네이버 검색 API 뉴스 수집 — 개발 순서 11단계.

Phase 1 정책 (ADR-4): 감정 태그는 전부 NEUTRAL, 요약 없음(제목·URL·날짜·출처만).
최근 7일 이내, 최대 10건.
"""

from __future__ import annotations

import html
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit

import httpx

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"
KST = timezone(timedelta(hours=9))

_TAG_RE = re.compile(r"</?b>")

_SOURCE_BY_DOMAIN = {
    "yna.co.kr": "연합뉴스",
    "hankyung.com": "한국경제",
    "mk.co.kr": "매일경제",
    "sedaily.com": "서울경제",
    "edaily.co.kr": "이데일리",
    "mt.co.kr": "머니투데이",
    "fnnews.com": "파이낸셜뉴스",
    "biz.chosun.com": "조선비즈",
    "hani.co.kr": "한겨레",
    "news.naver.com": "네이버뉴스",
}


def clean_title(raw: str) -> str:
    """검색 API가 끼워넣는 <b> 태그 제거 + HTML 엔티티 복원."""
    return html.unescape(_TAG_RE.sub("", raw)).strip()


def source_from_url(url: str) -> str:
    host = urlsplit(url).netloc.lower().removeprefix("www.")
    for domain, name in _SOURCE_BY_DOMAIN.items():
        if host.endswith(domain):
            return name
    return host or "출처 미상"


def parse_pubdate(rfc822: str) -> datetime | None:
    try:
        return parsedate_to_datetime(rfc822)
    except (TypeError, ValueError):
        return None


def _mentions(item: dict, name: str) -> bool:
    """제목 또는 요약에 종목명이 실제로 등장하는가 (공백·대소문자 무시)."""
    needle = name.replace(" ", "").lower()
    hay = clean_title(
        (item.get("title", "") or "") + " " + (item.get("description", "") or "")
    ).replace(" ", "").lower()
    return needle in hay


def select_recent(
    items: list[dict],
    now: datetime | None = None,
    days: int = 7,
    limit: int = 10,
    require: str | None = None,
) -> list[dict]:
    """최근 days일 이내 + (require 지정 시) 종목명 언급 기사만 limit개 (순수 함수).

    require 필터로 전부 걸러지면 관련성 낮은 오탐(축제·수상 소식 등)만 있었다는
    뜻이므로 빈 목록 대신 필터 없이 재선별한 결과를 반환한다 (호출부 폴백).
    """
    now = now or datetime.now(KST)
    cutoff = now - timedelta(days=days)
    out = []
    for item in items:
        dt = parse_pubdate(item.get("pubDate", ""))
        if dt is None or dt < cutoff:
            continue
        if require and not _mentions(item, require):
            continue
        link = item.get("originallink") or item.get("link") or ""
        out.append(
            {
                "title": clean_title(item.get("title", "")),
                "url": link,
                "date": dt.isoformat(),
                "source": source_from_url(link),
                "tag": "NEUTRAL",  # ADR-4: Phase 3에서 Claude 감정 분류로 교체
                "summary": None,
            }
        )
        if len(out) >= limit:
            break
    if not out and require:
        return select_recent(items, now=now, days=days, limit=limit, require=None)
    return out


async def fetch_news(
    query: str, client_id: str, client_secret: str, limit: int = 10
) -> list[dict]:
    """뉴스 검색. 실패 시 빈 목록 (graceful degradation)."""
    if not client_id or not client_secret:
        return []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                NAVER_NEWS_URL,
                # 종목명 단독 검색은 오탐이 많아(예: "NAVER") 주가 맥락을 붙인다
                params={"query": f"{query} 주가", "display": 50, "sort": "date"},
                headers={
                    "X-Naver-Client-Id": client_id,
                    "X-Naver-Client-Secret": client_secret,
                },
            )
        if resp.status_code != 200:
            return []
        return select_recent(resp.json().get("items", []), limit=limit, require=query)
    except httpx.HTTPError:
        return []
