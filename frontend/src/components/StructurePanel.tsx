import type { Structure } from "@/lib/types";
import { fmt } from "@/lib/format";

/** 차트 구조 분석 — 매물대·추세 채널·캔들·변동성 상태를 해석 문장과 함께 표시. */
export function StructurePanel({ structure, currentPrice }: { structure: Structure; currentPrice: number }) {
  const { supports, resistances, trend, candle, bollinger, divergence } = structure;
  const sup = supports[0];
  const res = resistances[0];

  return (
    <div className="mb-5 rounded-card border border-border bg-surface p-4 shadow-card md:p-6">
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className="text-[15px] font-semibold">차트 구조 분석</span>
        <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-dim">
          매물대 · 추세 · 캔들 · 변동성
        </span>
      </div>
      <p className="mb-4 text-[12px] text-fg-muted">
        가격이 어느 선에서 막히고 어디서 받쳐지는지, 지금 추세가 어디를 이탈하면 방향이 바뀌는지 정리했어요.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* 매물대 */}
        <Tile title="매물대 (지지·저항)">
          {res ? (
            <Line tone="bear">
              저항 {fmt.format(res.level)}원 <Meta>({res.touches}회 막힘 · {res.gapPct > 0 ? "+" : ""}{res.gapPct}%)</Meta>
            </Line>
          ) : (
            <Line tone="neutral">위쪽 뚜렷한 저항 없음 <Meta>(신고가 영역)</Meta></Line>
          )}
          {sup ? (
            <Line tone="bull">
              지지 {fmt.format(sup.level)}원 <Meta>({sup.touches}회 반등 · {sup.gapPct}%)</Meta>
            </Line>
          ) : (
            <Line tone="neutral">아래쪽 뚜렷한 지지 없음</Line>
          )}
          <Note>
            {sup && `지지 ${fmt.format(sup.level)}원이 깨지면 하방 압력이 커지고, `}
            {res
              ? `저항 ${fmt.format(res.level)}원을 거래량과 함께 넘으면 상방 여지가 열립니다.`
              : "저항이 없어 돌파 부담은 적은 구간입니다."}
          </Note>
        </Tile>

        {/* 추세 채널 */}
        <Tile title="추세 채널 (40일)">
          {trend ? (
            <>
              <Line tone={trend.direction === "up" ? "bull" : trend.direction === "down" ? "bear" : "neutral"}>
                {trend.direction === "up" ? "상승 추세" : trend.direction === "down" ? "하락 추세" : "횡보"}{" "}
                <Meta>(기울기 {trend.slopePct > 0 ? "+" : ""}{trend.slopePct}%)</Meta>
              </Line>
              <Line tone="neutral">
                채널 {fmt.format(trend.channelLower)} ~ {fmt.format(trend.channelUpper)}원
                {trend.breakout !== "none" && (
                  <Meta> · 현재 {trend.breakout === "up" ? "상단 위로 이탈" : "하단 아래로 이탈"}</Meta>
                )}
              </Line>
              <Note>
                {trend.direction === "up"
                  ? `채널 하단 ${fmt.format(trend.channelLower)}원 아래로 내려가면 상승 추세가 꺾일 가능성(하방), 그 전까지는 추세 유지로 봅니다.`
                  : trend.direction === "down"
                    ? `채널 상단 ${fmt.format(trend.channelUpper)}원 위로 올라서면 하락 추세 탈출 가능성(상방), 그 전까지는 반등도 채널에 막히기 쉽습니다.`
                    : "박스권이에요. 채널 상단 돌파 시 상방, 하단 이탈 시 하방으로 기울 수 있습니다."}
              </Note>
            </>
          ) : (
            <Line tone="neutral">데이터 부족</Line>
          )}
        </Tile>

        {/* 캔들 상태 */}
        <Tile title="캔들 상태">
          <Line tone={candle.direction === "bull" ? "bull" : candle.direction === "bear" ? "bear" : "neutral"}>
            {candle.name}
          </Line>
          <Note>
            {candle.direction === "neutral"
              ? "최근 캔들에 특별한 반전 패턴은 없어요."
              : candle.nearSr
                ? `${candle.desc} — 지지/저항 자리에서 나와 의미 있는 신호입니다.`
                : "패턴은 있지만 지지/저항 자리가 아니라 참고만 하세요 (허공 캔들은 노이즈일 확률이 높아요)."}
          </Note>
        </Tile>

        {/* 변동성·다이버전스 */}
        <Tile title="변동성 · 다이버전스">
          <Line tone={bollinger.state === "bb_expansion" ? (bollinger.direction === "up" ? "bull" : "bear") : "neutral"}>
            {bollinger.state === "bb_squeeze"
              ? "볼린저 스퀴즈"
              : bollinger.state === "bb_expansion"
                ? `밴드 확장 (${bollinger.direction === "up" ? "위" : "아래"} 방향)`
                : "변동성 보통"}
          </Line>
          <Line tone={divergence.state === "bullish" ? "bull" : divergence.state === "bearish" ? "bear" : "neutral"}>
            {divergence.state === "none"
              ? "다이버전스 없음"
              : divergence.state === "bearish"
                ? "약세 다이버전스"
                : "강세 다이버전스"}
          </Line>
          <Note>
            {bollinger.state === "bb_squeeze"
              ? "변동성이 극도로 줄었어요. 조만간 위든 아래든 큰 움직임이 나오기 쉬운 구간입니다."
              : divergence.state !== "none"
                ? divergence.desc
                : "변동성과 모멘텀에 특이 신호는 없습니다."}
          </Note>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-strong bg-elevated px-4 py-3.5 shadow-tile">
      <div className="mb-2.5 text-[12px] font-semibold tracking-[0.02em] text-fg-muted">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Line({ tone, children }: { tone: "bull" | "bear" | "neutral"; children: React.ReactNode }) {
  const color = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear-fg" : "text-fg";
  return <div className={`tnum text-[13px] font-semibold ${color}`}>{children}</div>;
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-normal text-fg-dim">{children}</span>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-[11px] leading-relaxed text-fg-dim">{children}</div>;
}
