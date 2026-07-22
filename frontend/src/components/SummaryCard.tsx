import type { AnalyzeResponse } from "@/lib/types";

const CHIP: Record<string, string> = {
  bull: "text-bull bg-bull-soft border-bull-border",
  bear: "text-bear-fg bg-bear-soft border-bear-border",
  warn: "text-warn bg-warn-soft border-warn-border",
  neutral: "text-fg-muted bg-elevated border-border-strong",
};

export function SummaryCard({ data }: { data: AnalyzeResponse }) {
  // 요약 문장에서 이스케이프 없이 지원되는 강조 마커 처리(간이): [[강조]] → 볼드 컬러
  const rendered = data.summary.split(/(\[\[[^\]]+\]\])/g).map((chunk, i) => {
    if (chunk.startsWith("[[") && chunk.endsWith("]]")) {
      return (
        <span key={i} className="text-bull">
          {chunk.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{chunk}</span>;
  });

  return (
    <div className="relative overflow-hidden rounded-card border border-border-strong bg-gradient-to-b from-[#222A3D] to-surface px-7 py-6 shadow-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-[220px] w-[220px]"
        style={{ background: "radial-gradient(circle, #E5484D22 0%, transparent 60%)" }}
      />
      <div className="mb-3.5 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-bull shadow-[0_0_12px_#E5484D]" />
        <span className="text-[12px] font-semibold tracking-[0.08em] text-fg-muted">SUMMARY</span>
      </div>
      <div className="text-[22px] font-semibold leading-[1.4] tracking-tightish">{rendered}</div>
      <div className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">{data.summarySub}</div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {data.chips.map((c, i) => (
          <span
            key={i}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${CHIP[c.tone]}`}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
