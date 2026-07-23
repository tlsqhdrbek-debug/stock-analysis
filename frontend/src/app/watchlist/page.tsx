"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { StockSearch } from "@/components/StockSearch";
import { getSupabase } from "@/lib/supabase";
import {
  loadWatchlist,
  removeWatch,
  toggleWatch,
  type WatchItem,
} from "@/lib/watchlist";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[] | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const refresh = useCallback(() => {
    loadWatchlist().then(setItems);
  }, []);

  useEffect(() => {
    refresh();
    getSupabase()
      ?.auth.getSession()
      .then(({ data }) => setLoggedIn(!!data.session));
  }, [refresh]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 md:px-8">
      <TopBar />
      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-[24px] font-bold tracking-tight2">관심종목</h1>
          <span className="rounded-full border border-border-strong bg-elevated px-2.5 py-1 text-[11px] text-fg-dim">
            {loggedIn ? "계정에 저장됨" : "이 브라우저에 저장됨"}
          </span>
        </div>
        <p className="mb-5 text-[13px] text-fg-muted">
          아래 검색창에서 바로 추가하거나, 분석 페이지의 별(★)로도 추가할 수 있어요.
          {!loggedIn && (
            <>
              {" "}
              <Link href="/login" className="text-[#8AB4FF]">
                로그인
              </Link>
              하면 어느 기기에서나 같은 목록을 볼 수 있습니다.
            </>
          )}
        </p>

        <StockSearch
          className="mb-6 max-w-[480px]"
          placeholder="추가할 종목 검색 (예: 삼성전자, 005930)"
          onSelect={async (hit) => {
            await toggleWatch({ ticker: hit.ticker, name: hit.name });
            refresh();
          }}
        />

        {items === null ? null : items.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
            <div className="mb-2 text-[15px] font-semibold">아직 관심종목이 없어요</div>
            <div className="mb-5 text-[13px] text-fg-muted">
              위 검색창에서 종목을 찾아 클릭하면 바로 추가됩니다.
            </div>
            <Link
              href="/analyze/005930"
              className="inline-block rounded-chip border border-border-strong bg-elevated px-4 py-2 text-[13px] text-fg shadow-tile transition-colors hover:border-stronger"
            >
              삼성전자 분석해 보기 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((w) => (
              <div
                key={w.ticker}
                className="flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-card"
              >
                <div>
                  <div className="text-[15px] font-semibold">{w.name}</div>
                  <div className="tnum mt-0.5 text-[12px] text-fg-dim">{w.ticker}</div>
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
                    onClick={async () => {
                      await removeWatch(w.ticker);
                      refresh();
                    }}
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
