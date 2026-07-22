"use client";

import { useEffect, useState } from "react";
import { isWatched, toggleWatch } from "@/lib/watchlist";

export function WatchStar({ ticker, name }: { ticker: string; name: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isWatched(ticker));
  }, [ticker]);

  return (
    <button
      type="button"
      aria-label={on ? "관심종목 해제" : "관심종목 추가"}
      title={on ? "관심종목 해제" : "관심종목 추가"}
      onClick={() => setOn(toggleWatch({ ticker, name }))}
      className={`border-0 bg-transparent p-0 transition-transform hover:scale-110 ${
        on ? "text-warn" : "text-fg-dim hover:text-warn"
      }`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={on ? 0 : 1.8}
      >
        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1L12 2z" />
      </svg>
    </button>
  );
}
