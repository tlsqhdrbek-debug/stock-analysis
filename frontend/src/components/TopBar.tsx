"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StockSearch } from "./StockSearch";
import { getSupabase } from "@/lib/supabase";

const NAV = [
  { href: "/", label: "분석" },
  { href: "/watchlist", label: "관심종목" },
  { href: "/screener", label: "스크리너" },
  { href: "/settings", label: "설정" },
];

export function TopBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/analyze")
      : pathname.startsWith(href);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 pt-2">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-bold tracking-tightish text-fg">
          <div className="h-[22px] w-[22px] rounded-md bg-gradient-to-br from-bull to-bear shadow-tile" />
          <span>MA Signal</span>
          <span className="hidden font-medium text-fg-dim md:inline">기술적 분석</span>
        </Link>
        <nav className="flex items-center gap-4 overflow-x-auto text-[13px] md:gap-5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                isActive(n.href)
                  ? "shrink-0 font-medium text-fg"
                  : "shrink-0 text-fg-muted transition-colors hover:text-fg"
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <StockSearch hotkey className="w-full sm:w-[340px]" />
        <AuthChip />
      </div>
    </div>
  );
}

function AuthChip() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email) {
    return (
      <button
        type="button"
        title={`${email} — 클릭 시 로그아웃`}
        onClick={async () => {
          await getSupabase()?.auth.signOut();
          router.refresh();
        }}
        className="shrink-0 rounded-chip border border-border-strong bg-elevated px-3 py-2 text-[12px] text-fg-muted shadow-tile transition-colors hover:text-fg"
      >
        {email.split("@")[0]} · 로그아웃
      </button>
    );
  }
  return (
    <Link
      href="/login"
      className="shrink-0 rounded-chip border border-border-strong bg-elevated px-3 py-2 text-[12px] text-fg shadow-tile transition-colors hover:border-stronger"
    >
      로그인
    </Link>
  );
}
