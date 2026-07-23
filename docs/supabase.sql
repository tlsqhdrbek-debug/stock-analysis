-- 사용자별 관심종목 테이블 + RLS (Supabase SQL Editor에서 실행)

create table if not exists public.user_watchlist (
  user_id    uuid not null references auth.users (id) on delete cascade,
  ticker     text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

alter table public.user_watchlist enable row level security;

create policy "own rows select" on public.user_watchlist
  for select using (auth.uid() = user_id);

create policy "own rows insert" on public.user_watchlist
  for insert with check (auth.uid() = user_id);

create policy "own rows delete" on public.user_watchlist
  for delete using (auth.uid() = user_id);
