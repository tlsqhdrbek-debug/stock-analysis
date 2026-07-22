"use client";

import { useState } from "react";
import type { AnalyzeResponse, Timeframe } from "@/lib/types";
import { fmt, fmtPct } from "@/lib/format";

const TABS: { key: Timeframe; label: string }[] = [
  { key: "daily", label: "일봉" },
  { key: "min240", label: "240분봉" },
  { key: "min60", label: "60분봉" },
];

export function MAStatusGrid({ data }: { data: AnalyzeResponse }) {
  const [tf, setTf] = useState<Timeframe>("daily");
  const rows = data.maStatus[tf].ma;

  return (
    <div className="flex-1 rounded-card border border-border bg-surface px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">이동평균선 상태</span>
          <span className="text-[11px] text-fg-dim">현재가 대비 이격도</span>
        </div>
        <div className="flex rounded-chip border border-border-strong bg-elevated p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTf(t.key)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[12px] ${
                tf === t.key
                  ? "bg-border-strong font-semibold text-fg"
                  : "bg-transparent text-fg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2.5">
        {rows.map((ma) => {
          const above = ma.side === "above";
          const tone = above ? "text-bull" : "text-bear-fg";
          const bg = above ? "bg-bull-soft" : "bg-bear-soft";
          const dot = above ? "bg-bull" : "bg-bear";
          const side = above ? "ABOVE" : "BELOW";
          return (
            <div
              key={ma.label}
              className="relative rounded-xl border border-border-strong bg-elevated px-3 py-3.5"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-fg-muted">{ma.label}</span>
                <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              </div>
              <div className="tnum mb-2 text-[15px] font-semibold text-fg">
                {fmt.format(ma.price)}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] ${tone} ${bg}`}
                >
                  {side}
                </span>
                <span className={`tnum text-[12px] font-semibold ${tone}`}>
                  {fmtPct(ma.gapPct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
