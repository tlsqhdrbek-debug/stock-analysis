export function TopBar() {
  return (
    <div className="flex items-center justify-between border-b border-border pb-6 pt-2">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5 text-[15px] font-bold tracking-tightish">
          <div className="h-[22px] w-[22px] rounded-md bg-gradient-to-br from-bull to-bear" />
          <span>MA Signal</span>
          <span className="font-medium text-fg-dim">기술적 분석</span>
        </div>
        <nav className="flex items-center gap-5 text-[13px] text-fg-muted">
          <span className="font-medium text-fg">분석</span>
          <span>관심종목</span>
          <span>스크리너</span>
          <span>설정</span>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex w-[340px] items-center gap-2 rounded-chip border border-border-strong bg-elevated px-3.5 py-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5B6472"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            placeholder="종목명 또는 코드 검색 (예: 삼성전자, 005930)"
            className="flex-1 border-none bg-transparent text-[13px] text-fg placeholder:text-fg-dim outline-none"
          />
          <kbd className="rounded bg-border px-1.5 py-0.5 text-[11px] text-fg-dim">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          aria-label="설정"
          className="flex items-center gap-1.5 rounded-chip border border-border-strong bg-elevated px-3 py-2 text-[13px] text-fg-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </button>
      </div>
    </div>
  );
}
