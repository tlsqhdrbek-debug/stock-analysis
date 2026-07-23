// 백엔드 호출 래퍼.
// Phase 1: mock 리턴. 백엔드 완성 후 fetch로 교체.
//
// 교체 지점:
//   const res = await fetch(`/api/backend/analyze/${ticker}`, { cache: "no-store" });
//   if (!res.ok) throw new Error(`analyze ${ticker} failed: ${res.status}`);
//   return (await res.json()) as AnalyzeResponse;
//
// next.config.mjs의 rewrites가 /api/backend/* → BACKEND_URL/api/* 로 프록시.

import type { AnalyzeResponse, ChartData } from "./types";
import { mockAnalyze } from "./mock";

export type ChartTF = "M" | "W" | "D" | "240" | "60";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

// 서버 컴포넌트(SSR)에선 절대 URL로 백엔드 직접 호출,
// 클라이언트에선 next.config.mjs rewrite(/api/backend/*) 경유.
function backendUrl(path: string): string {
  if (typeof window === "undefined") {
    const base = process.env.BACKEND_URL || "http://localhost:8000";
    return `${base}/api${path}`;
  }
  return `/api/backend${path}`;
}

export async function analyze(ticker: string): Promise<AnalyzeResponse> {
  if (USE_MOCK) {
    // 실제 네트워크 지연 흉내
    await new Promise((r) => setTimeout(r, 120));
    return { ...mockAnalyze, ticker: ticker || mockAnalyze.ticker };
  }
  const res = await fetch(backendUrl(`/analyze/${ticker}`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`analyze ${ticker} failed: ${res.status}`);
  return (await res.json()) as AnalyzeResponse;
}

export async function fetchCandles(
  ticker: string,
  tf: ChartTF,
): Promise<ChartData> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100));
    return mockAnalyze.chartData;
  }
  const res = await fetch(backendUrl(`/candles/${ticker}?tf=${tf}`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`candles ${ticker}/${tf} failed: ${res.status}`);
  return (await res.json()) as ChartData;
}

export interface AiSummary {
  ticker: string;
  model: string;
  summary: string;
  asOf: string;
}

export async function fetchAiSummary(ticker: string): Promise<AiSummary> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      ticker,
      model: "gpt-5-mini",
      summary:
        "현재 주가는 모든 이동평균선 위에 있는 정배열 상태로, 상승 흐름이 이어지고 있습니다. 60일선에서 세 차례 지지받았고 거래량도 평소보다 늘어 매수세가 붙어 있는 모습입니다. 다만 200일선과의 거리가 10% 가까이 벌어져 단기 과열 부담이 있고, RSI도 과매수권에 진입해 있습니다. 상승 확률이 우세하게 계산되지만, 단기 급등 뒤에는 평균선까지 되돌림이 나올 수 있다는 점을 함께 고려해야 합니다.",
      asOf: new Date().toISOString(),
    };
  }
  const res = await fetch(`/api/backend/ai-summary/${ticker}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ai-summary failed: ${res.status}`);
  return (await res.json()) as AiSummary;
}

export interface SearchHit {
  ticker: string;
  name: string;
  market: string;
}

export async function search(q: string): Promise<SearchHit[]> {
  if (USE_MOCK) {
    const seed: SearchHit[] = [
      { ticker: "005930", name: "삼성전자", market: "KOSPI" },
      { ticker: "000660", name: "SK하이닉스", market: "KOSPI" },
      { ticker: "035420", name: "NAVER", market: "KOSPI" },
      { ticker: "035720", name: "카카오", market: "KOSPI" },
      { ticker: "247540", name: "에코프로비엠", market: "KOSDAQ" },
    ];
    const needle = q.trim().toLowerCase();
    if (!needle) return seed;
    return seed.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.ticker.includes(needle),
    );
  }
  const res = await fetch(
    backendUrl(`/search?q=${encodeURIComponent(q)}`),
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchHit[];
}
