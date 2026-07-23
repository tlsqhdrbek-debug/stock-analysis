import { TopBar } from "@/components/TopBar";

export default function SettingsPage() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 md:px-8 pt-6">
      <TopBar />
      <div className="mt-8 max-w-[720px]">
        <h1 className="mb-6 text-[24px] font-bold tracking-tight2">설정</h1>

        <div className="mb-4 rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 text-[14px] font-semibold">데이터</div>
          <Row label="데이터 모드">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                useMock
                  ? "border-warn-border bg-warn-soft text-warn"
                  : "border-bull-border bg-bull-soft text-bull"
              }`}
            >
              {useMock ? "목업 데이터" : "실시간 (KIS OpenAPI)"}
            </span>
          </Row>
          <Row label="시세 출처">한국투자증권 KIS OpenAPI (일봉 기준)</Row>
          <Row label="뉴스 출처">네이버 검색 API (최근 7일 · 최대 10건)</Row>
          <Row label="분석 캐시">장중 5분 · 장외 60분 (Supabase PostgreSQL)</Row>
          <div className="mt-3 text-[11px] text-fg-dim">
            데이터 모드는 frontend/.env.local의 NEXT_PUBLIC_USE_MOCK으로 변경합니다.
          </div>
        </div>

        <div className="mb-4 rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 text-[14px] font-semibold">분석 모델</div>
          <Row label="지표">MA(5·10·20·60·120·200) · MACD(12,26,9) · RSI(14)</Row>
          <Row label="신호">배열 · 크로스(5-20, 20-60, 60-120) · 지지/저항 · 이격도 · 거래량</Row>
          <Row label="확률 산출">신호 가중합 → 시그모이드 (가중치: backend/config/weights.yaml)</Row>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="mb-3 text-[14px] font-semibold">고지</div>
          <p className="text-[12px] leading-relaxed text-fg-muted">
            본 서비스의 상방/하방 확률은 이동평균선 기반 기술적 분석의 통계적 추정치이며{" "}
            <strong className="text-fg">투자 추천이 아닙니다</strong>. 모든 투자 판단과 책임은
            사용자에게 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-[13px] last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right text-fg">{children}</span>
    </div>
  );
}
