import type { NewsItem } from "@/lib/types";

const TAG: Record<string, string> = {
  BULLISH: "text-bull bg-bull-soft",
  BEARISH: "text-bear-fg bg-bear-soft",
  NEUTRAL: "text-fg-muted bg-border-strong",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffHr = Math.floor((now.getTime() - d.getTime()) / (60 * 60 * 1000));
  if (diffHr < 1) return "방금";
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffHr < 48) return "어제";
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function NewsGrid({ ticker, name, news }: { ticker: string; name: string; news: NewsItem[] }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold">최근 뉴스</span>
          <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-muted">
            {name} 관련
          </span>
        </div>
        <a href="#" className="text-[12px] text-fg-muted">
          전체 보기 →
        </a>
      </div>
      {news.length === 0 && (
        <div className="rounded-xl border border-border-strong bg-elevated p-6 text-center text-[12px] text-fg-dim shadow-tile">
          최근 7일 내 관련 뉴스가 없습니다.
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {news.map((n, i) => (
          <a
            key={i}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-border-strong bg-elevated p-4 text-inherit shadow-tile transition-all hover:-translate-y-0.5 hover:border-stronger hover:shadow-lift"
          >
            <div className="mb-2.5 flex items-center gap-2">
              {n.tag && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ${TAG[n.tag]}`}
                >
                  {n.tag}
                </span>
              )}
              <span className="text-[11px] text-fg-dim">
                {n.source} · {formatDate(n.date)}
              </span>
            </div>
            <div className="mb-2 text-[14px] font-semibold leading-[1.4] text-fg">{n.title}</div>
            {n.summary && (
              <div className="text-[12px] leading-relaxed text-fg-muted">{n.summary}</div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
