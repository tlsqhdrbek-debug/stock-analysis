"""OpenAI 기반 AI 통합 요약 (gpt-5-mini).

이평선 상태·발동 신호·상방/하방 근거·뉴스 제목을 종합해
사용자 친화적인 한국어 요약을 생성한다. 매수/매도 추천 문구 금지.
"""

from __future__ import annotations

import httpx

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-5-mini"

_SYSTEM = (
    "너는 국내 주식 기술적 분석 리포트를 쉬운 한국어로 풀어주는 애널리스트 보조야. "
    "규칙: (1) 매수/매도/보유 추천 절대 금지 — '확률과 근거'만 서술. "
    "(2) 전문용어는 괄호로 짧게 풀어서. (3) 영향이 큰 근거 위주로, 전체 12줄 이내. "
    "(4) 아래 출력 형식을 반드시 그대로 지켜. 섹션 제목 줄과 불릿(•) 줄로만 구성:\n"
    "[핵심 결론]\n한두 문장 요약.\n\n"
    "[하방 요인]\n• 요인: 짧은 설명\n• …\n\n"
    "[상방 요인]\n• 요인: 짧은 설명\n\n"
    "[유의점]\n반대 시나리오 한두 문장."
)


class LLMError(RuntimeError):
    pass


def build_prompt(p: dict) -> str:
    """analyze 응답(dict, camelCase)을 압축 프롬프트로 변환."""
    ma_lines = [
        f"- {m['label']}: 현재가 대비 {m['gapPct']:+.1f}% ({'위' if m['side'] == 'above' else '아래'})"
        for m in p["maStatus"]["daily"]["ma"]
    ]
    sig_lines = [
        f"- [{'상방' if s['direction'] == 'bull' else '하방'}] {s['name']}: {s['desc']} (신뢰도 {s['confidence']}%)"
        for s in p["activeSignals"]
    ]
    bull = [f"- {r['title']}: {r['desc']}" for g in ("technical", "macro") for r in p["bullishReasons"][g]]
    bear = [f"- {r['title']}: {r['desc']}" for g in ("technical", "macro") for r in p["bearishReasons"][g]]
    news = [f"- {n['title']}" for n in p.get("news", [])]

    struct_lines: list[str] = []
    st = p.get("structure") or {}
    for s in st.get("supports", []):
        struct_lines.append(f"- 지지 매물대: {s['level']:,}원 ({s['touches']}회 반등, 현재가 대비 {s['gapPct']:+.1f}%)")
    for r in st.get("resistances", []):
        struct_lines.append(f"- 저항 매물대: {r['level']:,}원 ({r['touches']}회 저항, {r['gapPct']:+.1f}%)")
    if st.get("trend"):
        t = st["trend"]
        struct_lines.append(
            f"- 추세 채널: {t['direction']} (40일 기울기 {t['slopePct']:+.1f}%), "
            f"채널 {t['channelLower']:,}~{t['channelUpper']:,}원, 이탈 상태: {t['breakout']}"
        )
    return "\n".join(
        [
            f"종목: {p['name']} ({p['ticker']}) / 현재가 {p['currentPrice']:,.0f}원 ({p['changePct']:+.2f}%)",
            f"모델 산출 확률: 상방 {p['probability']['up']}% / 하방 {p['probability']['down']}%",
            f"요약 신호: {p['summary']}",
            "",
            "[이동평균선 상태(일봉)]",
            *ma_lines,
            "",
            "[발동 중인 신호]",
            *(sig_lines or ["- 없음"]),
            "",
            "[상방 근거]",
            *(bull or ["- 없음"]),
            "",
            "[하방 근거]",
            *(bear or ["- 없음"]),
            "",
            "[매물대·추세 구조]",
            *(struct_lines or ["- 없음"]),
            "",
            "[최근 뉴스 제목]",
            *(news or ["- 없음"]),
            "",
            "위 데이터를 종합해 이 종목의 현재 기술적 상황을 초보자도 이해할 수 있게 요약해줘.",
        ]
    )


async def generate_summary(payload: dict, api_key: str) -> str:
    if not api_key:
        raise LLMError("OPENAI_API_KEY 미설정")
    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": build_prompt(payload)},
        ],
        "max_completion_tokens": 1500,
        "reasoning_effort": "low",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            OPENAI_URL,
            json=body,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if resp.status_code == 400:
            # 파라미터 미지원 모델 대비 재시도
            body.pop("reasoning_effort", None)
            resp = await client.post(
                OPENAI_URL, json=body, headers={"Authorization": f"Bearer {api_key}"}
            )
    if resp.status_code != 200:
        detail = resp.json().get("error", {}).get("message", resp.text[:200])
        raise LLMError(f"OpenAI 호출 실패 ({resp.status_code}): {detail}")
    text = resp.json()["choices"][0]["message"]["content"].strip()
    if not text:
        raise LLMError("빈 응답")
    return text
