import type { AnalyzeResponse, Signal } from "@/lib/types";

const SIG_ICON: Record<Signal["type"], string[]> = {
  golden_cross: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  dead_cross: ["M3 7l6 6 4-4 8 8", "M15 17h6v-6"],
  perfect_alignment: ["M4 20V10M10 20V4M16 20v-8M22 20V6"],
  support: ["M3 12h18", "M6 8l-3 4 3 4", "M18 8l3 4-3 4"],
  resistance: ["M3 12h18"],
  overheated: ["M12 3v18", "M8 7l4-4 4 4", "M8 17l4 4 4-4"],
  oversold: ["M12 3v18", "M8 7l4-4 4 4"],
  volume_surge: ["M3 20l6-8 4 4 8-10"],
};

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// 신호 유형별 한 줄 해석 — 사용자가 "그래서 이게 무슨 뜻인지" 바로 알 수 있게.
function interpret(type: string, bull: boolean): string {
  switch (type) {
    case "golden_cross":
      return "단기 평균선이 장기선을 뚫고 올라왔어요. 상승 전환 초입에서 자주 나타나는 패턴입니다.";
    case "dead_cross":
      return "단기 평균선이 장기선 아래로 내려갔어요. 하락 전환 시 자주 나타나는 패턴입니다.";
    case "perfect_alignment":
      return bull
        ? "짧은 평균선부터 긴 평균선까지 위→아래로 가지런히 정렬된, 교과서적인 상승 추세예요."
        : "평균선이 반대로 뒤집혀 정렬된 하락 추세예요. 반등이 나와도 저항이 많습니다.";
    case "support":
      return "주가가 평균선 근처에서 반등하며 버티고 있어요. 이 선이 무너지는지가 관전 포인트입니다.";
    case "resistance":
      return "위쪽 평균선에 막혀 있어요. 이 선을 넘어야 추가 상승 여력이 생깁니다.";
    case "overheated":
      return "평균선에서 많이 멀어졌어요. 단기간 급등/급락 뒤에는 평균으로 되돌아오는 경우가 많습니다.";
    case "oversold":
      return "많이 빠져 있는 구간이에요. 기술적 반등이 나오기 쉬운 자리로 봅니다.";
    case "volume_surge":
      return "거래가 평소보다 활발해요. 거래량이 실리면 지금 방향의 신뢰도가 올라갑니다.";
    default:
      return "";
  }
}

export function SignalCards({ data }: { data: AnalyzeResponse }) {
  const signals = data.activeSignals;
  return (
    <div className="mb-5 rounded-card border border-border bg-surface p-4 shadow-card md:p-6">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold">발동 중인 신호</span>
          <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[11px] text-fg-muted">
            {signals.length}개
          </span>
        </div>
        <span className="text-[12px] text-fg-dim">최근 30일 기준</span>
      </div>
      <p className="mb-4 text-[12px] text-fg-muted">
        차트에서 포착된 패턴들이에요. 이 신호들이 위 종합 확률에 실제로 반영됩니다 —{" "}
        <span className="text-bull">빨간(BULLISH)</span> 신호가 우세하면 상방,{" "}
        <span className="text-bear-fg">파란(BEARISH)</span> 신호가 우세하면 하방 확률이 올라가요.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((s, i) => {
          const bull = s.direction === "bull";
          const tone = bull ? "text-bull" : "text-bear-fg";
          const iconBg = bull ? "bg-[#E5484D1A]" : "bg-[#3E63DD1A]";
          const border = bull ? "border-bull-border" : "border-bear-border";
          const glow = bull ? "bg-bull-softer" : "bg-bear-softer";
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl border bg-elevated p-4 shadow-tile ${border}`}
            >
              <div
                aria-hidden
                className={`absolute -right-5 -top-5 h-[70px] w-[70px] rounded-full blur-xl ${glow}`}
              />
              <div className="relative">
                <div className="mb-2.5 flex items-center justify-between">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${tone}`}
                  >
                    <Icon paths={SIG_ICON[s.type] ?? SIG_ICON.perfect_alignment} />
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] ${tone} ${iconBg}`}
                  >
                    {bull ? "BULLISH" : "BEARISH"}
                  </span>
                </div>
                <div className="mb-1 text-[14px] font-semibold text-fg">{s.name}</div>
                <div className="mb-2 text-[11px] leading-relaxed text-fg-muted">{s.desc}</div>
                <div className="mb-3 text-[11px] leading-relaxed text-fg-dim">
                  {interpret(s.type, bull)}
                </div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.06em] text-fg-dim">신뢰도</span>
                  <span className={`tnum text-[11px] font-semibold ${tone}`}>
                    {s.confidence}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-base">
                  <div
                    className={`h-full rounded-full ${bull ? "bg-bull" : "bg-bear-fg"}`}
                    style={{ width: `${s.confidence}%` }}
                  />
                </div>
                <div className="mt-2.5 text-[10px] text-fg-dim">발생 · {s.date}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 rounded-chip bg-elevated/60 px-3 py-2.5 text-[11px] leading-relaxed text-fg-dim">
        <strong className="text-fg-muted">신뢰도란?</strong> · 그 패턴이 차트에서 얼마나 뚜렷하게
        나타났는지를 뜻해요(발생 직후일수록, 거래량이 실릴수록 높음). 신호 하나로 판단하기보다
        여러 신호가 같은 방향을 가리키는지를 보는 것이 안전합니다. 본 화면은 투자 추천이 아닙니다.
      </div>
    </div>
  );
}
