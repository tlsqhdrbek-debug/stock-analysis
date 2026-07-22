import Link from "next/link";
import type { AnalyzeResponse } from "@/lib/types";
import { fmt, fmtMcap, fmtVol, fmtPct } from "@/lib/format";
import { WatchStar } from "./WatchStar";

export function StockHeader({ data }: { data: AnalyzeResponse }) {
  const up = data.change >= 0;
  const arrow = up ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth={2.5}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5B7CFF" strokeWidth={2.5}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
  const changeBg = up ? "bg-[#331B22] border-bull-border" : "bg-[#1B2540] border-bear-border";
  const priceColor = up ? "text-bull" : "text-bear-fg";
  const changeColor = up ? "text-bull" : "text-bear-fg";
  const dt = new Date(data.asOf);
  const asOfLabel = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(
    dt.getDate(),
  ).padStart(2, "0")}  ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} KST`;

  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-8">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/screener"
            aria-label="종목 목록으로"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-elevated text-fg-muted shadow-tile transition-colors hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="rounded-full border border-border-strong bg-elevated px-2.5 py-1 text-[12px] text-fg-dim">
            {data.market}
          </span>
          <span className="text-[12px] text-fg-dim">{data.ticker}</span>
          {data.sector && (
            <>
              <span className="text-[12px] text-fg-dim">·</span>
              <span className="text-[12px] text-fg-dim">{data.sector}</span>
            </>
          )}
        </div>
        <div className="mb-2 flex items-baseline gap-4">
          <h1 className="m-0 text-[34px] font-bold tracking-tight2">{data.name}</h1>
          <WatchStar ticker={data.ticker} name={data.name} />
        </div>
        <div className="flex items-baseline gap-3.5">
          <span className={`tnum text-[40px] font-bold tracking-tight2 ${priceColor}`}>
            {fmt.format(data.currentPrice)}
          </span>
          <span className="text-[14px] text-fg-muted">KRW</span>
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${changeBg}`}>
            {arrow}
            <span className={`tnum text-[14px] font-semibold ${changeColor}`}>
              {up ? "+" : ""}
              {fmt.format(data.change)}
            </span>
            <span className={`tnum text-[14px] font-semibold ${changeColor}`}>
              {fmtPct(data.changePct)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2.5 text-right">
        <div className="text-[12px] text-fg-dim">분석 시각 · {asOfLabel}</div>
        <div className="flex gap-1.5">
          <Stat label="고가" value={fmt.format(data.high)} color="text-bull" />
          <Stat label="저가" value={fmt.format(data.low)} color="text-bear-fg" />
          <Stat label="거래량" value={fmtVol(data.volume)} color="text-fg" />
          {data.marketCap && (
            <Stat label="시총" value={fmtMcap(data.marketCap)} color="text-fg" />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-[12px] shadow-tile">
      <div className="mb-0.5 text-fg-dim">{label}</div>
      <div className={`tnum font-semibold ${color}`}>{value}</div>
    </div>
  );
}
