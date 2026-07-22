# design/

Claude Design으로 만든 UI 시안 원본을 그대로 보존하는 폴더입니다.

## 파일

- `StockAnalysis.dc.html` — 메인 분석 페이지 목업 (다크 테마, 1440px 기준)

## 사용 규칙

- **이 폴더의 파일은 원본으로 보존**합니다. 수정 금지.
- 실제 프론트엔드 구현은 `frontend/`에 있으며, 이 시안을 React/Next.js로 이관한 결과입니다.
- 컬러·타이포·여백·컴포넌트 배치는 이 시안이 소스 오브 트루스(source of truth). 임의 변경 금지.

## 디자인 토큰 요약

| 토큰 | 값 | 용도 |
|---|---|---|
| bg (base) | `#0A0B0F` | 페이지 배경 |
| bg (surface) | `#0F1119` | 카드 배경 |
| bg (elevated) | `#12141C` | 카드 내부 요소 |
| border | `#1A1D26`, `#1F2330` | 카드 테두리 |
| text (primary) | `#E6E8EE` | 본문 |
| text (muted) | `#8B93A3` | 보조 |
| text (dim) | `#5B6472` | 라벨/캡션 |
| **상방 (bullish)** | `#E5484D` | 빨강 (한국식) |
| **하방 (bearish)** | `#3E63DD`, `#5B7CFF` | 파랑 (한국식) |
| warning | `#F5A524` | 과열/주의 |
| MA5 / MA10 / MA20 / MA60 / MA120 / MA200 | `#F5A524` / `#F97066` / `#7DD87D` / `#5B7CFF` / `#C084FC` / `#8B93A3` | 이평선 색 |

폰트: Pretendard Variable (cdn.jsdelivr).
숫자: `font-variant-numeric: tabular-nums` (클래스 `tnum`).

## 브라우저에서 미리보기

`StockAnalysis.dc.html`은 Claude Design 런타임(`support.js`)에 의존하므로 로컬 브라우저 단독 오픈 시 데이터 바인딩이 렌더링되지 않습니다. 시안 확인은 Claude Design 툴 안에서, 또는 정적 이미지로 export 후 확인하세요.
