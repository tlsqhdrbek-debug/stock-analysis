import type { Reason } from "@/lib/types";

export function ReasonPanel({
  direction,
  probability,
  technical,
  macro,
}: {
  direction: "bull" | "bear";
  probability: number;
  technical: Reason[];
  macro: Reason[];
}) {
  const bull = direction === "bull";
  const tone = bull ? "text-bull" : "text-bear-fg";
  const iconBg = bull ? "bg-bull-softer" : "bg-bear-softer";
  const border = bull ? "border-bull-softer" : "border-bear-softer";
  const grad = bull
    ? "from-[#2B1E27] to-surface"
    : "from-[#1D2740] to-surface";
  const bg = bull ? "bg-bull-soft" : "bg-bear-soft";
  const weightBg = bull ? "bg-bull-soft" : "bg-bear-soft";
  const heading = bull ? "상방 근거" : "하방 근거";
  const sign = bull ? "+" : "−";

  const arrow = bull ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth={2.5}>
      <path d="M7 17l10-10M7 7h10v10" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B7CFF" strokeWidth={2.5}>
      <path d="M17 7L7 17M17 17H7V7" />
    </svg>
  );

  return (
    <div className={`rounded-card border ${border} bg-gradient-to-b ${grad} p-6 shadow-card`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            {arrow}
          </div>
          <span className="text-[15px] font-semibold">{heading}</span>
        </div>
        <span className={`tnum text-[12px] font-semibold ${tone}`}>{probability.toFixed(1)}%</span>
      </div>
      <SectionLabel>기술적</SectionLabel>
      <ReasonList reasons={technical} tone={tone} bg={bg} weightBg={weightBg} sign={sign} />
      <SectionLabel className="mt-5">매크로</SectionLabel>
      <ReasonList reasons={macro} tone={tone} bg={bg} weightBg={weightBg} sign={sign} />
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-fg-dim ${className}`}>
      {children}
    </div>
  );
}

function ReasonList({
  reasons,
  tone,
  bg,
  weightBg,
  sign,
}: {
  reasons: Reason[];
  tone: string;
  bg: string;
  weightBg: string;
  sign: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {reasons.map((r, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-chip border border-border-strong bg-elevated px-3.5 py-3 shadow-tile"
        >
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${bg} ${tone}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="mb-0.5 text-[13px] font-semibold text-fg">{r.title}</div>
            <div className="text-[12px] leading-relaxed text-fg-muted">{r.desc}</div>
          </div>
          <div
            className={`self-start rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone} ${weightBg}`}
          >
            {sign}
            {r.weight}
          </div>
        </div>
      ))}
    </div>
  );
}
