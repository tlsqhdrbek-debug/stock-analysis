"use client";

import type { AnalyzeResponse } from "@/lib/types";

const MA_COLORS: Record<string, string> = {
  "5": "#F5A524",
  "10": "#F97066",
  "20": "#7DD87D",
  "60": "#5B7CFF",
  "120": "#C084FC",
  "200": "#8B93A3",
};

const LEGEND = [
  ["MA5", "#F5A524"],
  ["MA10", "#F97066"],
  ["MA20", "#7DD87D"],
  ["MA60", "#5B7CFF"],
  ["MA120", "#C084FC"],
  ["MA200", "#8B93A3"],
] as const;

export function CandleChart({ data }: { data: AnalyzeResponse }) {
  const W = 1180;
  const H = 380;
  const PAD_L = 46;
  const PAD_R = 30;
  const PAD_T = 20;
  const chartH = 260;
  const volH = 70;

  const candles = data.chartData.candles;
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const yMin = Math.floor(Math.min(...lows) / 1000) * 1000 - 1000;
  const yMax = Math.ceil(Math.max(...highs) / 1000) * 1000 + 1000;
  const y = (v: number) => PAD_T + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const cw = (W - PAD_L - PAD_R) / candles.length;
  const cbw = cw * 0.62;

  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
    const v = yMin + ((yMax - yMin) * i) / 5;
    const yy = y(v);
    gridLines.push(
      <g key={`g-${i}`}>
        <line x1={PAD_L} x2={W - PAD_R} y1={yy} y2={yy} stroke="#1A1D26" strokeWidth={1} />
        <text x={PAD_L - 8} y={yy + 3} fill="#5B6472" fontSize={10} textAnchor="end">
          {v.toLocaleString()}
        </text>
      </g>,
    );
  }

  const candleEls = candles.map((c, i) => {
    const x = PAD_L + i * cw;
    const up = c.c >= c.o;
    const color = up ? "#E5484D" : "#3E63DD";
    return (
      <g key={`c-${i}`}>
        <line x1={x + cbw / 2} x2={x + cbw / 2} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
        <rect
          x={x}
          y={y(Math.max(c.o, c.c))}
          width={cbw}
          height={Math.max(1, Math.abs(y(c.o) - y(c.c)))}
          fill={color}
        />
      </g>
    );
  });

  const pathFor = (arr: (number | null)[]) =>
    arr
      .map((v, i) =>
        v == null ? null : `${i === 0 || arr[i - 1] == null ? "M" : "L"}${(PAD_L + i * cw + cbw / 2).toFixed(1)} ${y(v).toFixed(1)}`,
      )
      .filter(Boolean)
      .join(" ");

  const maPaths = Object.entries(data.chartData.ma).map(([k, series]) => (
    <path
      key={`ma-${k}`}
      d={pathFor(series)}
      fill="none"
      stroke={MA_COLORS[k] ?? "#8B93A3"}
      strokeWidth={k === "200" ? 1.2 : 1.5}
      strokeDasharray={k === "200" ? "3 3" : undefined}
      opacity={0.95}
    />
  ));

  const volBase = PAD_T + chartH + 20;
  const volMax = Math.max(...candles.map((c) => c.v));
  const volEls = candles.map((c, i) => {
    const x = PAD_L + i * cw;
    const h = (c.v / volMax) * volH;
    const up = c.c >= c.o;
    return (
      <rect
        key={`v-${i}`}
        x={x}
        y={volBase + volH - h}
        width={cbw}
        height={h}
        fill={up ? "#E5484D66" : "#3E63DD66"}
      />
    );
  });

  const currentY = y(data.currentPrice);
  const dateLabels = [0, Math.floor(candles.length / 4), Math.floor(candles.length / 2), Math.floor((candles.length * 3) / 4), candles.length - 1].map(
    (i) => {
      const x = PAD_L + i * cw + cbw / 2;
      const d = new Date(candles[i].t);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      return (
        <text key={`d-${i}`} x={x} y={volBase + volH + 16} fill="#5B6472" fontSize={10} textAnchor="middle">
          {label}
        </text>
      );
    },
  );

  return (
    <div className="mb-5 rounded-card border border-border bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[15px] font-semibold">캔들 + 이동평균선</span>
          <div className="flex flex-wrap gap-3.5 text-[11px]">
            {LEGEND.map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-fg-muted">
                <div className="h-0.5 w-3.5" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex rounded-chip border border-border-strong bg-elevated p-0.5">
          <button className="rounded-[7px] bg-border-strong px-3.5 py-1.5 text-[12px] font-semibold text-fg">
            일봉
          </button>
          <button className="rounded-[7px] px-3.5 py-1.5 text-[12px] text-fg-muted">240분봉</button>
          <button className="rounded-[7px] px-3.5 py-1.5 text-[12px] text-fg-muted">60분봉</button>
        </div>
      </div>
      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          {gridLines}
          {candleEls}
          {maPaths}
          <g>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={currentY}
              y2={currentY}
              stroke="#E5484D"
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.6}
            />
            <rect x={W - PAD_R - 60} y={currentY - 10} width={58} height={20} fill="#E5484D" rx={4} />
            <text
              x={W - PAD_R - 31}
              y={currentY + 4}
              fill="#fff"
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
            >
              {data.currentPrice.toLocaleString()}
            </text>
          </g>
          <line x1={PAD_L} x2={W - PAD_R} y1={volBase} y2={volBase} stroke="#1A1D26" />
          <text x={PAD_L - 8} y={volBase + 12} fill="#5B6472" fontSize={10} textAnchor="end">
            VOL
          </text>
          {volEls}
          {dateLabels}
        </svg>
      </div>
    </div>
  );
}
