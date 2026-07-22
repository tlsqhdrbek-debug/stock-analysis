import { analyze } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { StockHeader } from "@/components/StockHeader";
import { ProbabilityGauge } from "@/components/ProbabilityGauge";
import { SummaryCard } from "@/components/SummaryCard";
import { MAStatusGrid } from "@/components/MAStatusGrid";
import { SignalCards } from "@/components/SignalCards";
import { CandleChart } from "@/components/CandleChart";
import { ReasonPanel } from "@/components/ReasonPanel";
import { NewsGrid } from "@/components/NewsGrid";
import { Disclaimer } from "@/components/Disclaimer";

export const dynamic = "force-dynamic";

export default async function AnalyzePage({
  params,
}: {
  params: { ticker: string };
}) {
  const data = await analyze(params.ticker);

  return (
    <div className="mx-auto max-w-[1440px] px-8 pb-20 pt-6">
      <TopBar />
      <div className="mt-8">
        <StockHeader data={data} />

        {/* Row 1: 확률 게이지 + 요약/이평선 */}
        <div className="mb-5 grid grid-cols-[420px_1fr] gap-5">
          <ProbabilityGauge data={data} />
          <div className="flex flex-col gap-5">
            <SummaryCard data={data} />
            <MAStatusGrid data={data} />
          </div>
        </div>

        {/* Row 2: 발동 신호 */}
        <SignalCards data={data} />

        {/* Row 3: 캔들 차트 */}
        <CandleChart data={data} />

        {/* Row 4: 상방/하방 근거 */}
        <div className="mb-5 grid grid-cols-2 gap-5">
          <ReasonPanel
            direction="bull"
            probability={data.probability.up}
            technical={data.bullishReasons.technical}
            macro={data.bullishReasons.macro}
          />
          <ReasonPanel
            direction="bear"
            probability={data.probability.down}
            technical={data.bearishReasons.technical}
            macro={data.bearishReasons.macro}
          />
        </div>

        {/* Row 5: 뉴스 */}
        <NewsGrid ticker={data.ticker} name={data.name} news={data.news} />

        <Disclaimer />
      </div>
    </div>
  );
}
