"use client";

import { useEffect, useState } from "react";
import { fetchAiSummary } from "@/lib/api";

export function AISummary({ ticker }: { ticker: string }) {
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    setText(null);
    fetchAiSummary(ticker)
      .then((r) => {
        if (alive) {
          setText(r.summary);
          setState("done");
        }
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [ticker]);

  return (
    <div className="relative overflow-hidden rounded-card border border-[#7C5CFC44] bg-gradient-to-b from-[#241F3D] to-surface px-5 py-5 shadow-card md:px-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-[200px] w-[200px]"
        style={{ background: "radial-gradient(circle, #7C5CFC26 0%, transparent 60%)" }}
      />
      <div className="mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth={2}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
          <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
        </svg>
        <span className="text-[12px] font-semibold tracking-[0.08em] text-[#A78BFA]">
          AI 통합 요약
        </span>
        <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[10px] text-fg-dim">
          gpt-5-mini
        </span>
      </div>

      {state === "loading" && (
        <div className="space-y-2.5 py-1" aria-label="AI 분석 생성 중">
          <div className="h-3.5 w-full animate-pulse rounded bg-border-strong/60" />
          <div className="h-3.5 w-[92%] animate-pulse rounded bg-border-strong/50" />
          <div className="h-3.5 w-[78%] animate-pulse rounded bg-border-strong/40" />
          <div className="pt-1 text-[11px] text-fg-dim">
            AI가 이평선·신호·근거·뉴스를 종합하는 중이에요…
          </div>
        </div>
      )}
      {state === "error" && (
        <div className="text-[12px] text-fg-dim">
          AI 요약을 불러오지 못했어요. 잠시 후 새로고침하면 다시 시도합니다.
        </div>
      )}
      {state === "done" && text && (
        <div className="space-y-2.5">
          {text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="text-[13.5px] leading-[1.75] text-fg">
              {para}
            </p>
          ))}
          <div className="pt-1 text-[10px] text-fg-dim">
            AI가 생성한 요약으로 오류가 있을 수 있으며, 투자 추천이 아닙니다.
          </div>
        </div>
      )}
    </div>
  );
}
