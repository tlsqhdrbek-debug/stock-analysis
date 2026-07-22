export function Disclaimer() {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5B6472"
        strokeWidth={2}
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div className="text-[11px] leading-relaxed text-fg-dim">
        본 화면은 이동평균선 기반{" "}
        <strong className="text-fg-muted">기술적 분석 결과</strong>이며{" "}
        <strong className="text-fg-muted">투자 추천이 아닙니다</strong>. 상방/하방 확률은 과거
        데이터 기반의 통계적 추정치로, 실제 시장 움직임과 다를 수 있습니다. 모든 투자 판단과 책임은
        사용자에게 있습니다.
      </div>
    </div>
  );
}
