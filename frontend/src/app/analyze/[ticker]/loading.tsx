import { TopBar } from "@/components/TopBar";

export default function AnalyzeLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 md:px-8">
      <TopBar />
      <div className="mt-8">
        {/* 헤더 스켈레톤 */}
        <div className="mb-7 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-border-strong/50" />
          <div className="h-9 w-64 animate-pulse rounded bg-border-strong/60" />
          <div className="h-10 w-52 animate-pulse rounded bg-border-strong/50" />
        </div>
        {/* 본문 스켈레톤 + 안내 */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
          <div className="h-[380px] animate-pulse rounded-card border border-border bg-surface shadow-card" />
          <div className="space-y-5">
            <div className="h-[160px] animate-pulse rounded-card border border-border bg-surface shadow-card" />
            <div className="h-[190px] animate-pulse rounded-card border border-border bg-surface shadow-card" />
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3 text-[13px] text-fg-muted">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
          </svg>
          종목 시세를 조회하고 분석하는 중이에요…
        </div>
      </div>
    </div>
  );
}
