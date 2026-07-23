// 관심종목 저장소.
// - 비로그인: localStorage
// - 로그인(Supabase 설정 시): user_watchlist 테이블 (RLS로 사용자별 격리)
//   테이블 스키마는 docs/supabase.sql 참고.

import { getSupabase } from "./supabase";

export interface WatchItem {
  ticker: string;
  name: string;
}

const KEY = "ma-signal:watchlist";
const TABLE = "user_watchlist";

// ── localStorage ──────────────────────────────────────

function localList(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as WatchItem[];
  } catch {
    return [];
  }
}

function saveLocal(list: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ── 세션 헬퍼 ─────────────────────────────────────────

async function userId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

// ── 공개 API (클라우드 우선, 폴백 local) ──────────────

export async function loadWatchlist(): Promise<WatchItem[]> {
  const uid = await userId();
  if (uid) {
    const { data, error } = await getSupabase()!
      .from(TABLE)
      .select("ticker,name")
      .order("created_at", { ascending: false });
    if (!error && data) return data as WatchItem[];
  }
  return localList();
}

export async function isWatched(ticker: string): Promise<boolean> {
  const uid = await userId();
  if (uid) {
    const { data } = await getSupabase()!
      .from(TABLE)
      .select("ticker")
      .eq("ticker", ticker)
      .maybeSingle();
    return !!data;
  }
  return localList().some((w) => w.ticker === ticker);
}

/** 토글. 반환값 true = 추가됨. */
export async function toggleWatch(item: WatchItem): Promise<boolean> {
  const uid = await userId();
  if (uid) {
    const sb = getSupabase()!;
    if (await isWatched(item.ticker)) {
      await sb.from(TABLE).delete().eq("ticker", item.ticker);
      return false;
    }
    await sb.from(TABLE).insert({ user_id: uid, ...item });
    return true;
  }
  const list = localList();
  const idx = list.findIndex((w) => w.ticker === item.ticker);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveLocal(list);
    return false;
  }
  list.unshift(item);
  saveLocal(list);
  return true;
}

export async function removeWatch(ticker: string): Promise<void> {
  const uid = await userId();
  if (uid) {
    await getSupabase()!.from(TABLE).delete().eq("ticker", ticker);
    return;
  }
  saveLocal(localList().filter((w) => w.ticker !== ticker));
}

/** 로그인 직후 localStorage 목록을 클라우드로 병합. */
export async function mergeLocalToCloud(): Promise<void> {
  const uid = await userId();
  const local = localList();
  if (!uid || local.length === 0) return;
  await getSupabase()!
    .from(TABLE)
    .upsert(
      local.map((w) => ({ user_id: uid, ...w })),
      { onConflict: "user_id,ticker" },
    );
  saveLocal([]);
}
