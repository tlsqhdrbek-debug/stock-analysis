import type { AnalyzeResponse, Signal } from "@/lib/types";

const SIG_ICON: Record<Signal["type"], string[]> = {
  golden_cross: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  dead_cross: ["M3 7l6 6 4-4 8 8", "M15 17h6v-6"],
  perfect_alignment: ["M4 20V10M10 20V4M16 20v-8M22 20V6"],
  support: ["M3 12h18", "M6 8l-3 4 3 4", "M18 8l3 4-3 4"],
  resistance: ["M3 12h18"],
  overheated: ["M12 3v18", "M8 7l4-4 4 4", "M8 17l4 4 4-4"],
  oversold: ["M12 3v18", "M8 7l4-4 4 4"],
  volume_surge: ["M3 20l6-8 4 4 8-10"],
};

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function SignalCards({ data }: { data: AnalyzeResponse }) {
  const signals = data.activeSignals;
  return (
    <div className="mb-5 rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold">발동 중인 신호</span>
          <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-muted">
            {signals.length}개
          </span>
        </div>
        <span className="text-[12px] text-fg-dim">최근 30일 기준</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {signals.map((s, i) => {
          const bull = s.direction === "bull";
          const tone = bull ? "text-bull" : "text-bear-fg";
          const iconBg = bull ? "bg-[#E5484D1A]" : "bg-[#3E63DD1A]";
          const border = bull ? "border-bull-border" : "border-bear-border";
          const glow = bull ? "bg-bull-softer" : "bg-bear-softer";
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl border bg-elevated p-4 shadow-tile ${border}`}
            >
              <div
                aria-hidden
                className={`absolute -right-5 -top-5 h-[70px] w-[70px] rounded-full blur-xl ${glow}`}
              />
              <div className="relative">
                <div className="mb-2.5 flex items-center justify-between">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${tone}`}
                  >
                    <Icon paths={SIG_ICON[s.type] ?? SIG_ICON.perfect_alignment} />
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] ${tone} ${iconBg}`}
                  >
                    {bull ? "BULLISH" : "BEARISH"}
                  </span>
                </div>
                <div className="mb-1 text-[14px] font-semibold text-fg">{s.name}</div>
                <div className="mb-3 text-[11px] leading-relaxed text-fg-muted">{s.desc}</div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.06em] text-fg-dim">신뢰도</span>
                  <span className={`tnum text-[11px] font-semibold ${tone}`}>
                    {s.confidence}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-base">
                  <div
                    className={`h-full rounded-full ${bull ? "bg-bull" : "bg-bear-fg"}`}
                    style={{ width: `${s.confidence}%` }}
                  />
                </div>
                <div className="mt-2.5 text-[10px] text-fg-dim">발생 · {s.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
