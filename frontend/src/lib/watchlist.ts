// 관심종목 — Phase 1은 localStorage. (로그인 도입 시 서버 저장으로 교체)

export interface WatchItem {
  ticker: string;
  name: string;
}

const KEY = "ma-signal:watchlist";

export function getWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as WatchItem[];
  } catch {
    return [];
  }
}

export function isWatched(ticker: string): boolean {
  return getWatchlist().some((w) => w.ticker === ticker);
}

export function toggleWatch(item: WatchItem): boolean {
  const list = getWatchlist();
  const idx = list.findIndex((w) => w.ticker === item.ticker);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(item);
  }
  localStorage.setItem(KEY, JSON.stringify(list));
  return idx < 0; // true = 추가됨
}

export function removeWatch(ticker: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(getWatchlist().filter((w) => w.ticker !== ticker)),
  );
}
