"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { search, type SearchHit } from "@/lib/api";

const NAV = [
  { href: "/", label: "분석" },
  { href: "/watchlist", label: "관심종목" },
  { href: "/screener", label: "스크리너" },
  { href: "/settings", label: "설정" },
];

export function TopBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/analyze")
      : pathname.startsWith(href);

  return (
    <div className="flex items-center justify-between border-b border-border pb-6 pt-2">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-bold tracking-tightish text-fg">
          <div className="h-[22px] w-[22px] rounded-md bg-gradient-to-br from-bull to-bear shadow-tile" />
          <span>MA Signal</span>
          <span className="font-medium text-fg-dim">기술적 분석</span>
        </Link>
        <nav className="flex items-center gap-5 text-[13px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                isActive(n.href)
                  ? "font-medium text-fg"
                  : "text-fg-muted transition-colors hover:text-fg"
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <SearchBox />
        <Link
          href="/settings"
          aria-label="설정"
          className="flex items-center gap-1.5 rounded-chip border border-border-strong bg-elevated px-3 py-2 text-[13px] text-fg-muted shadow-tile transition-colors hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function SearchBox() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // 디바운스 검색
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

  // ⌘K / Ctrl+K 포커스
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (ticker: string) => {
      setOpen(false);
      setQ("");
      router.push(`/analyze/${ticker}`);
    },
    [router],
  );

  const isCode = /^\d{6}$/.test(q.trim());
  const options: { ticker: string; label: string; sub: string }[] = [
    ...hits.map((h) => ({ ticker: h.ticker, label: h.name, sub: `${h.ticker} · ${h.market}` })),
    ...(isCode && !hits.some((h) => h.ticker === q.trim())
      ? [{ ticker: q.trim(), label: `코드로 분석: ${q.trim()}`, sub: "종목코드 직접 입력" }]
      : []),
  ];

  return (
    <div className="relative">
      <div className="flex w-[340px] items-center gap-2 rounded-chip border border-border-strong bg-elevated px-3.5 py-2 shadow-tile focus-within:border-stronger">
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
              go(options[highlight].ticker);
            }
          }}
          placeholder="종목명 또는 코드 검색 (예: 삼성전자, 005930)"
          className="flex-1 border-none bg-transparent text-[13px] text-fg placeholder:text-fg-dim outline-none"
        />
        <kbd className="rounded bg-border px-1.5 py-0.5 text-[11px] text-fg-dim">⌘K</kbd>
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-chip border border-border-strong bg-elevated shadow-lift">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-fg-dim">
              검색 결과 없음 — 6자리 종목코드로도 조회할 수 있어요
            </div>
          ) : (
            options.map((o, i) => (
              <button
                key={o.ticker + o.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(o.ticker);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] ${
                  i === highlight ? "bg-border-strong text-fg" : "text-fg-muted"
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="text-[11px] text-fg-dim">{o.sub}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
