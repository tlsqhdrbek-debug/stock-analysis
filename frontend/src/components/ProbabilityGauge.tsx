import type { AnalyzeResponse } from "@/lib/types";

export function ProbabilityGauge({ data }: { data: AnalyzeResponse }) {
  const up = data.probability.up;
  const down = data.probability.down;
  const total = 440; // 반원 arc 길이 근사 (design과 동일)
  const upDash = (up / 100) * total;
  const horizonLabel =
    data.horizon === "short" ? "SHORT-TERM · 5D" : data.horizon === "mid" ? "MID-TERM · 20D" : "LONG-TERM · 60D";
  const dominant = up >= down ? "상방" : "하방";
  const dominantPct = Math.max(up, down);
  const dominantColor = up >= down ? "text-bull" : "text-bear-fg";

  return (
    <div className="flex flex-col items-center rounded-card border border-border bg-surface p-7 shadow-card">
      <div className="mb-2 flex w-full items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">종합 확률</span>
        <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-dim">
          MA 기반 · 60일 학습
        </span>
      </div>
      <div className="relative mt-2 h-[200px] w-[340px]">
        <svg width="340" height="200" viewBox="0 0 340 200">
          <defs>
            <linearGradient id="upGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#E5484D" stopOpacity="0.9" />
              <stop offset="1" stopColor="#FF7A85" />
            </linearGradient>
            <linearGradient id="downGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#5B7CFF" />
              <stop offset="1" stopColor="#3E63DD" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M 30 170 A 140 140 0 0 1 310 170" stroke="#272E3F" strokeWidth={22} fill="none" strokeLinecap="round" />
          <path
            d="M 30 170 A 140 140 0 0 1 310 170"
            stroke="url(#downGrad)"
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={total}
            strokeDashoffset={upDash}
          />
          <path
            d="M 30 170 A 140 140 0 0 1 310 170"
            stroke="url(#upGrad)"
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${upDash} ${total}`}
          />
          <g stroke="#3A4560" strokeWidth={1}>
            <line x1="30" y1="180" x2="30" y2="192" />
            <line x1="170" y1="30" x2="170" y2="18" />
            <line x1="310" y1="180" x2="310" y2="192" />
          </g>
        </svg>
        <div className="absolute inset-x-0 top-[80px] text-center">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-fg-dim">{horizonLabel}</div>
          <div className={`tnum mt-1.5 text-[52px] font-bold leading-none tracking-tight2 ${dominantColor}`}>
            {dominantPct}
            <span className="text-[24px] font-medium text-fg-muted">%</span>
          </div>
          <div className="mt-1.5 text-[12px] text-fg-muted">{dominant} 우세</div>
        </div>
        <div className="absolute left-3.5 top-[172px] text-[11px] text-fg-dim">0%</div>
        <div className="absolute right-3.5 top-[172px] text-[11px] text-fg-dim">100%</div>
      </div>
      <div className="mt-2 grid w-full grid-cols-2 gap-2.5">
        <div className="rounded-chip border border-bull-softer bg-elevated px-3.5 py-3 shadow-tile">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-bull" />
            <span className="text-[11px] tracking-[0.08em] text-fg-muted">UPSIDE</span>
          </div>
          <div className="tnum text-[22px] font-bold text-bull">
            {up.toFixed(1)}
            <span className="text-[13px] font-medium text-fg-muted">%</span>
          </div>
        </div>
        <div className="rounded-chip border border-bear-softer bg-elevated px-3.5 py-3 shadow-tile">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-bear" />
            <span className="text-[11px] tracking-[0.08em] text-fg-muted">DOWNSIDE</span>
          </div>
          <div className="tnum text-[22px] font-bold text-bear-fg">
            {down.toFixed(1)}
            <span className="text-[13px] font-medium text-fg-muted">%</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 self-start text-[11px] text-fg-dim">
        <span>모델 신뢰도</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 w-3.5 rounded ${i < data.modelConfidence ? "bg-bull" : "bg-border-stronger"}`}
            />
          ))}
        </div>
        <span className="text-fg-muted">{data.modelConfidence}/5</span>
      </div>
    </div>
  );
}
