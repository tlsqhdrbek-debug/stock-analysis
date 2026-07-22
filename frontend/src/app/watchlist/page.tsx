"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { getWatchlist, removeWatch, type WatchItem } from "@/lib/watchlist";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    setItems(getWatchlist());
  }, []);

  const remove = (ticker: string) => {
    removeWatch(ticker);
    setItems(getWatchlist());
  };

  return (
    <div className="mx-auto max-w-[1440px] px-8 pb-20 pt-6">
      <TopBar />
      <div className="mt-8">
        <h1 className="mb-2 text-[24px] font-bold tracking-tight2">관심종목</h1>
        <p className="mb-6 text-[13px] text-fg-muted">
          분석 페이지에서 별(★)을 눌러 추가할 수 있습니다. 이 목록은 브라우저에 저장됩니다.
        </p>

        {items === null ? null : items.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
            <div className="mb-2 text-[15px] font-semibold">아직 관심종목이 없어요</div>
            <div className="mb-5 text-[13px] text-fg-muted">
              종목을 분석한 뒤 종목명 옆의 별을 눌러 추가해 보세요.
            </div>
            <Link
              href="/analyze/005930"
              className="inline-block rounded-chip border border-border-strong bg-elevated px-4 py-2 text-[13px] text-fg shadow-tile transition-colors hover:border-stronger"
            >
              삼성전자 분석해 보기 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items.map((w) => (
              <div
                key={w.ticker}
                className="flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-card"
              >
                <div>
                  <div className="text-[15px] font-semibold">{w.name}</div>
                  <div className="mt-0.5 text-[12px] text-fg-dim">{w.ticker}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/analyze/${w.ticker}`}
                    className="rounded-chip border border-border-strong bg-elevated px-3 py-1.5 text-[12px] text-fg shadow-tile transition-colors hover:border-stronger"
                  >
                    분석
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(w.ticker)}
                    aria-label="관심종목에서 제거"
                    className="rounded-chip border border-border-strong bg-elevated px-2.5 py-1.5 text-[12px] text-fg-dim shadow-tile transition-colors hover:text-bull"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
