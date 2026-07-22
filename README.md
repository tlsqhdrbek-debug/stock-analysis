# stock-analysis

국내 주식 이동평균선 기반 실시간 분석 웹앱.
사용자가 종목을 입력하면 한국투자증권 KIS API로 시세를 조회하고,
이동평균선 기반 기술적 분석으로 **상방/하방 확률과 근거**를 리포트합니다.

> ⚠️ **매수/매도 추천 아님.** 통계적 확률과 신호의 근거만 표시.

## 현재 진행 상황 (Phase 1)

| 단계 | 상태 |
|---|---|
| .gitignore / .env.example / .env | ✅ |
| design/ 시안 보존 | ✅ |
| frontend/ Next.js 14 이관 (목업) | ✅ |
| KIS 클라이언트 (토큰 캐시·일봉) | ✅ |
| 지표 계산 (MA/MACD/RSI) | ✅ |
| 신호·스코어링 | ✅ |
| FastAPI `/api/analyze/{ticker}` | ✅ (일봉) |
| lib/api.ts를 실제 백엔드 연결 | ✅ |
| DB 캐시 (장중 5분/장외 60분) | ✅ Supabase |
| 뉴스 수집 (네이버 검색 API) | ✅ |
| sectors.yaml 매크로 매핑 | ✅ |
| 검색·관심종목·스크리너·설정 UI | ✅ |
| 분봉(60/240) + MTF 정합성 | ⏳ |

## 디렉토리

```
stock-analysis/
├── design/              # Claude Design 시안 원본 (수정 금지)
├── frontend/            # Next.js 14 앱 (design 기반)
├── backend/             # (아직 없음) FastAPI 서비스 예정
├── docs/                # 아키텍처 문서
├── .env / .env.example  # KIS 앱키·DB URL
└── .gitignore
```

## 로컬 실행

```bash
# 터미널 1 — 백엔드 (Windows는 반드시 run.py로: psycopg 이벤트루프 이슈)
cd backend
.venv/Scripts/python run.py          # http://localhost:8000

# 터미널 2 — 프론트엔드
cd frontend
npm install
npm run dev                          # http://localhost:3000
```

프론트 실데이터 모드는 `frontend/.env.local`:

```
NEXT_PUBLIC_USE_MOCK=false
BACKEND_URL=http://localhost:8000
```

`.env.local`이 없으면 목업 데이터로 동작합니다 (백엔드 불필요).

## 기술 스택

- **Backend**: Python 3.11, FastAPI, httpx, pandas, numpy, SQLAlchemy, Pydantic v2
- **Frontend**: Next.js 14 · TypeScript · Tailwind CSS
- **DB**: Supabase PostgreSQL (분석 캐시)
- **테스트**: pytest (지표·신호 커버리지 80% 목표)

## 데이터 소스

- 시세: **한국투자증권 KIS OpenAPI** (`koreainvestment/open-trading-api`)
  - 일봉 · 60분봉 (240분봉은 60분봉 리샘플)
  - Access token 24h 캐시, rate limit 20 req/s, 429 시 지수백오프
  - `KIS_ENV=paper` → 모의투자, `real` → 실전투자
- 뉴스: 네이버 금융 · 연합/한경 RSS (최근 7일 · 최대 10건)
- 매크로: `config/sectors.yaml` 정적 매핑 (Phase 1)

## 보안

- `.env`는 절대 커밋 금지 (`.gitignore`로 이미 제외).
- 시크릿 하드코딩 금지, 반드시 `.env` 참조.
- 프론트에 API 키 노출 금지 (백엔드 프록시 경유).

## 문서

- `docs/architecture.md` — 시스템 아키텍처 (예정)
- `design/README.md` — 디자인 토큰 · 시안 원본 규칙
- `frontend/README.md` — Next.js 앱 실행 방법
