// 백엔드 응답 스키마. 백엔드 pydantic 모델과 1:1 일치 유지.

export type Timeframe = "daily" | "min240" | "min60";

export interface MAStatus {
  label: string;      // "MA 5"
  period: number;     // 5
  price: number;      // 이평선 값
  gapPct: number;     // 현재가 대비 이격도 (%)
  side: "above" | "below"; // 현재가가 이평선 위/아래
}

export interface TimeframeMAStatus {
  ma: MAStatus[];       // [MA5, MA10, MA20, MA60, MA120, MA200]
  arrangement:          // 이동평균 배열 상태
    | "perfect_bull"    // 정배열 5>10>20>60>120>200
    | "perfect_bear"    // 역배열
    | "mixed";
  arrangementStreak: number; // 유지 일수
}

export interface Signal {
  type:
    | "golden_cross"
    | "dead_cross"
    | "perfect_alignment"
    | "support"
    | "resistance"
    | "overheated"
    | "oversold"
    | "volume_surge"
    | "sr_support"
    | "sr_resistance"
    | "fake_breakout"
    | "trend_up"
    | "trend_down"
    | "channel_break"
    | "bb_squeeze"
    | "bb_expansion"
    | "candle_pattern"
    | "rsi_divergence"
    | "multi_confirm";
  pair?: string;         // "5-20", "20-60" 등 크로스 신호
  name: string;          // "골든크로스 임박"
  desc: string;
  direction: "bull" | "bear";
  confidence: number;    // 0-100
  date: string;          // ISO or 예상일 문자열
  weight: number;        // 스코어 기여도
}

export interface Reason {
  icon?: string;      // 아이콘 키 (프론트에서 매핑)
  title: string;
  desc: string;
  weight: number;     // 스코어 기여도
}

export interface NewsItem {
  title: string;
  url: string;
  date: string;         // ISO
  source: string;       // "한국경제"
  tag?: "BULLISH" | "BEARISH" | "NEUTRAL"; // Phase 1에서는 NEUTRAL 기본
  summary?: string;     // Phase 3(Claude) 후에 채워짐
}

export interface Candle {
  t: string;   // ISO
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface ChartData {
  candles: Candle[];
  ma: Record<string, (number | null)[]>; // { "5": [...], "10": [...], ... }
}

export interface AnalyzeResponse {
  ticker: string;
  name: string;
  market: string;         // "KOSPI" | "KOSDAQ"
  sector?: string;
  currentPrice: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;         // 주 단위
  marketCap?: number;     // 원 단위
  asOf: string;           // ISO

  probability: { up: number; down: number }; // 0-100
  modelConfidence: number;                    // 0-5
  horizon: "short" | "mid" | "long";          // 예측 지평

  summary: string;             // 22px 큰 요약
  summarySub: string;          // 13px 서브
  chips: {
    label: string;
    tone: "bull" | "bear" | "warn" | "neutral";
  }[];

  maStatus: Record<Timeframe, TimeframeMAStatus>;
  activeSignals: Signal[];

  bullishReasons: {
    technical: Reason[];
    macro: Reason[];
  };
  bearishReasons: {
    technical: Reason[];
    macro: Reason[];
  };

  news: NewsItem[];
  chartData: ChartData;
}
