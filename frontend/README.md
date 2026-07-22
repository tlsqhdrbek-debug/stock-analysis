# frontend

Next.js 14 (App Router) · TypeScript · Tailwind CSS
`design/StockAnalysis.dc.html` 시안을 React 컴포넌트로 이관한 결과물.

## 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 자동으로 `/analyze/005930` (삼성전자 목업) 진입.

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `true` | `false`로 두면 백엔드 호출. Phase 1은 `true` 고정. |
| `BACKEND_URL` | `http://localhost:8000` | `next.config.mjs`의 rewrites 프록시 대상. |

## 디렉토리

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # / → /analyze/005930 리다이렉트
│   │   ├── analyze/[ticker]/page.tsx   # 분석 페이지
│   │   └── globals.css
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── StockHeader.tsx
│   │   ├── ProbabilityGauge.tsx        # 반원 게이지 SVG
│   │   ├── SummaryCard.tsx
│   │   ├── MAStatusGrid.tsx            # 일/240분/60분 탭
│   │   ├── SignalCards.tsx             # 발동 중 신호 4개
│   │   ├── CandleChart.tsx             # 캔들+MA+거래량 SVG
│   │   ├── ReasonPanel.tsx             # 상방/하방 근거 리스트
│   │   ├── NewsGrid.tsx                # 뉴스 3개
│   │   └── Disclaimer.tsx
│   └── lib/
│       ├── types.ts       # 백엔드 응답 스키마
│       ├── mock.ts        # 목업 응답
│       ├── api.ts         # 백엔드 호출 래퍼 (지금은 mock)
│       └── format.ts      # 숫자 포맷 유틸
├── tailwind.config.ts     # 디자인 토큰 (bull/bear/warn, MA 색상)
├── next.config.mjs        # /api/backend/* → BACKEND_URL/api/* 프록시
├── postcss.config.mjs
├── tsconfig.json
├── .eslintrc.json
└── package.json
```

## 백엔드 붙일 때

1. 백엔드가 `/api/analyze/{ticker}` 응답을 `AnalyzeResponse` 타입으로 반환하도록 구현.
2. `.env.local`에 `NEXT_PUBLIC_USE_MOCK=false`.
3. `src/lib/api.ts`가 알아서 `fetch("/api/backend/analyze/...")`로 프록시 경유.
4. 응답 스키마가 바뀌면 `src/lib/types.ts` 먼저 갱신 → 타입 에러가 뜬 컴포넌트를 순서대로 수정.

## 디자인 원칙

- 색상·여백·타이포는 `design/StockAnalysis.dc.html`이 소스 오브 트루스. 임의 변경 금지.
- Tailwind 토큰(`bull`, `bear`, `warn`, `ma5`~`ma200`) 우선 사용.
- 한국식 컬러 규칙: **상방=빨강, 하방=파랑** — 절대 반대로 두지 말 것.
- 새 컴포넌트를 만들면 `design/README.md`의 토큰 표를 따라간다.
