"use client";

import type { AnalyzeResponse } from "@/lib/types";
import { fmt } from "@/lib/format";

export function MAStatusGrid({ data }: { data: AnalyzeResponse }) {
  const rows = data.maStatus.daily.ma;
  const aboveCount = rows.filter((m) => m.side === "above").length;
  const total = rows.length;

  const headline =
    aboveCount === total
      ? "모든 평균선 위에 있어요 — 상승 흐름이 탄탄한 상태입니다."
      : aboveCount >= total - 1
        ? "대부분의 평균선 위에 있어요 — 상승 흐름이 우세합니다."
        : aboveCount >= Math.ceil(total / 2)
          ? "평균선 위아래가 섞여 있어요 — 방향이 갈리는 구간입니다."
          : aboveCount >= 1
            ? "대부분의 평균선 아래에 있어요 — 하락 흐름이 우세합니다."
            : "모든 평균선 아래에 있어요 — 약세가 뚜렷한 상태입니다.";

  return (
    <div className="flex-1 rounded-card border border-border bg-surface px-4 py-5 shadow-card md:px-6">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-semibold">이동평균선 상태</span>
        <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-dim">
          일봉 기준
        </span>
      </div>
      <p className="mb-4 text-[12px] text-fg-muted">
        현재가가 {total}개 평균선 중 <strong className="text-fg">{aboveCount}개 위</strong>에 있습니다. {headline}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {rows.map((ma) => {
          const above = ma.side === "above";
          const tone = above ? "text-bull" : "text-bear-fg";
          const bg = above ? "bg-bull-soft" : "bg-bear-soft";
          const dot = above ? "bg-bull" : "bg-bear";
          const gapAbs = Math.abs(ma.gapPct).toFixed(1);
          return (
            <div key={ma.label} className="relative rounded-xl border border-border-strong bg-elevated px-3 py-3.5 shadow-tile">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-fg-muted">{ma.label}</span>
                <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              </div>
              <div className="tnum mb-2 text-[15px] font-semibold text-fg">{fmt.format(ma.price)}</div>
              <div className="flex items-center justify-between gap-1">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tone} ${bg}`}>
                  {above ? "지지선" : "저항선"}
                </span>
                <span className={`tnum text-[12px] font-semibold ${tone}`}>
                  {gapAbs}% {above ? "위" : "아래"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 rounded-chip bg-elevated/60 px-3 py-2.5 text-[11px] leading-relaxed text-fg-dim">
        <strong className="text-fg-muted">읽는 법</strong> · 퍼센트는 현재가가 각 평균선에서 얼마나
        떨어져 있는지(이격도)예요. 현재가가 평균선 <span className="text-bull">위</span>면 그 선이
        떨어질 때 받쳐주는 <span className="text-bull">지지선</span>, <span className="text-bear-fg">아래</span>면
        오를 때 막히기 쉬운 <span className="text-bear-fg">저항선</span> 역할을 합니다. 장기선(200일)에서
        +10% 이상 떨어져 있으면 단기 과열로 봐요.
      </div>
    </div>
  );
}
