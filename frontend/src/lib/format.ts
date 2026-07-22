export const fmt = new Intl.NumberFormat("ko-KR");

export function fmtPct(v: number, digits = 2): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function fmtWon(v: number): string {
  return fmt.format(Math.round(v));
}

export function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function fmtMcap(won: number): string {
  const jo = 1_000_000_000_000;
  const eok = 100_000_000;
  if (won >= jo) return `${(won / jo).toFixed(0)}조`;
  if (won >= eok) return `${(won / eok).toFixed(0)}억`;
  return fmt.format(won);
}
