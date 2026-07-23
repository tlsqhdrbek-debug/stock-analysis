"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { search, type SearchHit } from "@/lib/api";

export function StockSearch({
  onSelect,
  placeholder = "종목명 또는 코드 검색 (예: 삼성전자, 005930)",
  hotkey = false,
  className = "",
}: {
  onSelect?: (hit: SearchHit) => void;
  placeholder?: string;
  hotkey?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setHits(await search(q));
        setHighlight(0);
      } catch {
        setHits([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  const pick = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      setQ("");
      if (onSelect) onSelect(hit);
      else {
        router.push(`/analyze/${hit.ticker}`);
        router.refresh(); // 라우터 캐시 무효화 — 뉴스 등 이전 종목 데이터 잔존 방지
      }
    },
    [onSelect, router],
  );

  const isCode = /^\d{6}$/.test(q.trim());
  const options: SearchHit[] = [
    ...hits,
    ...(isCode && !hits.some((h) => h.ticker === q.trim())
      ? [{ ticker: q.trim(), name: `코드로 조회: ${q.trim()}`, market: "직접 입력" }]
      : []),
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-chip border border-border-strong bg-elevated px-3.5 py-2 shadow-tile focus-within:border-stronger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E7995" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && options[highlight]) {
              pick(options[highlight]);
            }
          }}
          placeholder={placeholder}
          className="flex-1 border-none bg-transparent text-[13px] text-fg placeholder:text-fg-dim outline-none"
        />
        {hotkey && (
          <kbd className="hidden rounded bg-border px-1.5 py-0.5 text-[11px] text-fg-dim sm:block">
            ⌘K
          </kbd>
        )}
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-chip border border-border-strong bg-elevated shadow-lift">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-fg-dim">
              검색 결과 없음 — 6자리 종목코드로도 조회할 수 있어요
            </div>
          ) : (
            options.map((o, i) => (
              <button
                key={o.ticker + o.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] ${
                  i === highlight ? "bg-border-strong text-fg" : "text-fg-muted"
                }`}
              >
                <span className="font-medium">{o.name}</span>
                <span className="tnum text-[11px] text-fg-dim">
                  {o.ticker} · {o.market}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
