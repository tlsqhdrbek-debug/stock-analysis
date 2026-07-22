import type { AnalyzeResponse, Candle } from "./types";

// 목업 캔들 60개 생성 (design/StockAnalysis.dc.html의 로직과 동일한 시드)
function genCandles(): Candle[] {
  const N = 60;
  const candles: Candle[] = [];
  let price = 71500;
  let seed = 7;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < N; i++) {
    const drift = 100 + i * 4;
    const vol = 500 + rng() * 400;
    const open = price;
    const close = open + drift * 0.4 + (rng() - 0.45) * vol;
    const high = Math.max(open, close) + rng() * vol * 0.6;
    const low = Math.min(open, close) - rng() * vol * 0.6;
    const d = new Date(2026, 4, 1 + i);
    candles.push({
      t: d.toISOString(),
      o: open,
      h: high,
      l: low,
      c: close,
      v: Math.round((0.4 + rng() * 0.9) * 10_000_000),
    });
    price = close;
  }
  const scale = 78400 / candles[N - 1].c;
  candles.forEach((c) => {
    c.o *= scale;
    c.c *= scale;
    c.h *= scale;
    c.l *= scale;
  });
  return candles;
}

function ma(closes: number[], n: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let k = i - n + 1; k <= i; k++) s += closes[k];
    return s / n;
  });
}

const candles = genCandles();
const closes = candles.map((c) => c.c);
// 60/120/200일은 60캔들로 계산 불가 → 20일 이평 근사 스케일(디자인과 동일)
const ma20 = ma(closes, 20);
const mockChart = {
  candles,
  ma: {
    "5": ma(closes, 5),
    "10": ma(closes, 10),
    "20": ma20,
    "60": ma20.map((v) => (v ? v * 0.965 : null)),
    "120": ma20.map((v) => (v ? v * 0.945 : null)),
    "200": ma20.map((v) => (v ? v * 0.928 : null)),
  },
};

export const mockAnalyze: AnalyzeResponse = {
  ticker: "005930",
  name: "삼성전자",
  market: "KOSPI",
  sector: "반도체",
  currentPrice: 78400,
  change: 1600,
  changePct: 2.08,
  high: 78900,
  low: 76900,
  volume: 14_200_000,
  marketCap: 468_000_000_000_000,
  asOf: "2026-07-22T15:30:00+09:00",

  probability: { up: 62, down: 38 },
  modelConfidence: 4,
  horizon: "short",

  summary: "정배열 유지, 60일선 지지 확인. 240분봉 골든크로스 초입.",
  summarySub:
    "단기·중기 이동평균선이 모두 상방 배열이며, 60일선(74,320)에서 3거래일 연속 지지받는 중. 다만 200일선 이격도가 +9.8%로 확대되어 과열 부담이 존재합니다.",
  chips: [
    { label: "정배열", tone: "bull" },
    { label: "골든크로스 임박", tone: "bull" },
    { label: "과열 주의", tone: "warn" },
    { label: "거래량 증가", tone: "neutral" },
  ],

  maStatus: {
    daily: {
      arrangement: "perfect_bull",
      arrangementStreak: 12,
      ma: [
        { label: "MA 5", period: 5, price: 77860, gapPct: 0.69, side: "above" },
        { label: "MA 10", period: 10, price: 77120, gapPct: 1.66, side: "above" },
        { label: "MA 20", period: 20, price: 75890, gapPct: 3.31, side: "above" },
        { label: "MA 60", period: 60, price: 74320, gapPct: 5.49, side: "above" },
        { label: "MA 120", period: 120, price: 72140, gapPct: 8.68, side: "above" },
        { label: "MA 200", period: 200, price: 71410, gapPct: 9.79, side: "above" },
      ],
    },
    min240: {
      arrangement: "perfect_bull",
      arrangementStreak: 4,
      ma: [
        { label: "MA 5", period: 5, price: 78100, gapPct: 0.38, side: "above" },
        { label: "MA 10", period: 10, price: 77680, gapPct: 0.93, side: "above" },
        { label: "MA 20", period: 20, price: 76950, gapPct: 1.88, side: "above" },
        { label: "MA 60", period: 60, price: 75510, gapPct: 3.83, side: "above" },
        { label: "MA 120", period: 120, price: 73920, gapPct: 6.06, side: "above" },
        { label: "MA 200", period: 200, price: 72380, gapPct: 8.32, side: "above" },
      ],
    },
    min60: {
      arrangement: "mixed",
      arrangementStreak: 1,
      ma: [
        { label: "MA 5", period: 5, price: 78320, gapPct: 0.10, side: "above" },
        { label: "MA 10", period: 10, price: 78100, gapPct: 0.38, side: "above" },
        { label: "MA 20", period: 20, price: 77820, gapPct: 0.74, side: "above" },
        { label: "MA 60", period: 60, price: 77240, gapPct: 1.50, side: "above" },
        { label: "MA 120", period: 120, price: 76510, gapPct: 2.47, side: "above" },
        { label: "MA 200", period: 200, price: 75320, gapPct: 4.09, side: "above" },
      ],
    },
  },

  activeSignals: [
    {
      type: "golden_cross",
      pair: "20-60",
      name: "골든크로스 임박",
      desc: "240분봉 20선이 60선 상향돌파 D-1",
      direction: "bull",
      confidence: 78,
      date: "예상 07.23",
      weight: 16,
    },
    {
      type: "perfect_alignment",
      name: "정배열 지속",
      desc: "5>10>20>60>120>200 배열 12일차",
      direction: "bull",
      confidence: 86,
      date: "2026.07.10",
      weight: 18,
    },
    {
      type: "support",
      name: "60일선 지지",
      desc: "74,320원 지지 3회 확인",
      direction: "bull",
      confidence: 72,
      date: "2026.07.18",
      weight: 14,
    },
    {
      type: "overheated",
      name: "200일 이격 과열",
      desc: "+9.8% 도달, 평균 대비 +2σ",
      direction: "bear",
      confidence: 54,
      date: "2026.07.22",
      weight: 11,
    },
  ],

  bullishReasons: {
    technical: [
      {
        title: "단기·중기 정배열",
        desc: "MA5·10·20·60이 위에서부터 순차 배열, 상승 추세 명확",
        weight: 18,
      },
      {
        title: "60일선 지지 확인",
        desc: "74,320원 부근 3거래일 연속 종가 지지",
        weight: 14,
      },
      {
        title: "거래량 동반 상승",
        desc: "20일 평균 대비 +38%, 매수세 유입 강화",
        weight: 12,
      },
    ],
    macro: [
      {
        title: "반도체 업황 회복",
        desc: "DRAM 현물가 3주 연속 상승 (+7.2%)",
        weight: 10,
      },
      {
        title: "외국인 순매수 지속",
        desc: "최근 5거래일 누적 +8,240억 원 순매수",
        weight: 9,
      },
      {
        title: "환율 안정화",
        desc: "USD/KRW 1,340원대 안착, 수출주 우호적",
        weight: 6,
      },
    ],
  },
  bearishReasons: {
    technical: [
      {
        title: "200일 이격 확대",
        desc: "+9.8% (2σ 이상), 단기 조정 압력",
        weight: 11,
      },
      { title: "RSI 과매수권", desc: "일봉 RSI 71.4, 과매수 임계 진입", weight: 8 },
      {
        title: "상단 저항선 근접",
        desc: "전고점 79,800원까지 여유 +1.8%",
        weight: 7,
      },
    ],
    macro: [
      {
        title: "미 국채금리 상승",
        desc: "10Y +12bp 급등, 성장주 부담",
        weight: 9,
      },
      {
        title: "중국 수요 둔화 우려",
        desc: "PMI 49.2, 3개월 연속 위축 구간",
        weight: 7,
      },
      {
        title: "옵션 만기 부담",
        desc: "익월 만기 앞 프로그램 매도 가능성",
        weight: 5,
      },
    ],
  },

  news: [
    {
      title: "삼성전자, HBM3E 12단 양산 승인… 엔비디아 공급 확대",
      url: "#",
      date: "2026-07-22T13:30:00+09:00",
      source: "한국경제",
      tag: "BULLISH",
      summary:
        "차세대 HBM 공급 물량이 늘어나며 하반기 실적 개선 기대감이 커지고 있다.",
    },
    {
      title: "2분기 잠정실적 발표 앞두고 증권가 눈높이 상향",
      url: "#",
      date: "2026-07-22T10:00:00+09:00",
      source: "매일경제",
      tag: "NEUTRAL",
      summary: "컨센서스 영업이익이 한 달 새 6.4% 상향 조정되었다.",
    },
    {
      title: "미 반도체 수출규제 강화 논의… 대중 매출 리스크 부각",
      url: "#",
      date: "2026-07-21T18:00:00+09:00",
      source: "연합뉴스",
      tag: "BEARISH",
      summary: "중국향 매출 비중이 높은 종목에 단기 변동성이 예상된다.",
    },
  ],

  chartData: mockChart,
};
