import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { search, type SearchHit } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  let stocks: SearchHit[] = [];
  let error: string | null = null;
  try {
    stocks = await search("");
  } catch {
    error = "백엔드에 연결할 수 없습니다. backend 서버(포트 8000)가 켜져 있는지 확인해 주세요.";
  }

  return (
    <div className="mx-auto max-w-[1440px] px-8 pb-20 pt-6">
      <TopBar />
      <div className="mt-8">
        <div className="mb-2 flex items-baseline gap-3">
          <h1 className="text-[24px] font-bold tracking-tight2">스크리너</h1>
          <span className="rounded-full border border-border-strong bg-elevated px-2.5 py-1 text-[11px] text-fg-dim">
            지표 필터는 준비 중 · Phase 2
          </span>
        </div>
        <p className="mb-6 text-[13px] text-fg-muted">
          주요 종목 목록입니다. 종목을 클릭하면 이동평균 분석을 실행합니다.
        </p>

        {error ? (
          <div className="rounded-card border border-warn-border bg-surface p-6 text-[13px] text-warn shadow-card">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] tracking-[0.06em] text-fg-dim">
                  <th className="px-5 py-3 font-semibold">종목명</th>
                  <th className="px-5 py-3 font-semibold">코드</th>
                  <th className="px-5 py-3 font-semibold">시장</th>
                  <th className="px-5 py-3 text-right font-semibold">분석</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr
                    key={s.ticker}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-elevated"
                  >
                    <td className="px-5 py-3 font-medium text-fg">
                      <Link href={`/analyze/${s.ticker}`} className="block text-fg">
                        {s.name}
                      </Link>
                    </td>
                    <td className="tnum px-5 py-3 text-fg-muted">{s.ticker}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-dim">
                        {s.market}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/analyze/${s.ticker}`}
                        className="inline-block rounded-chip border border-border-strong bg-elevated px-3 py-1.5 text-[12px] text-fg shadow-tile transition-colors hover:border-stronger"
                      >
                        분석 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
