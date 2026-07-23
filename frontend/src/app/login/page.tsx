"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { getSupabase } from "@/lib/supabase";
import { mergeLocalToCloud } from "@/lib/watchlist";

export default function LoginPage() {
  const sb = getSupabase();

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 md:px-8">
      <TopBar />
      <div className="mx-auto mt-10 max-w-[420px]">
        <h1 className="mb-2 text-[24px] font-bold tracking-tight2">로그인</h1>
        <p className="mb-6 text-[13px] text-fg-muted">
          로그인하면 관심종목이 계정에 저장되어 어느 기기에서나 볼 수 있어요.
        </p>
        {sb ? <LoginForm /> : <SetupGuide />}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (mode: "signin" | "signup") => {
    const sb = getSupabase()!;
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "signin"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    if (error) {
      setMsg(
        error.message.includes("Invalid login")
          ? "이메일 또는 비밀번호가 올바르지 않아요."
          : error.message.includes("already registered")
            ? "이미 가입된 이메일이에요. 로그인해 주세요."
            : `오류: ${error.message}`,
      );
      setBusy(false);
      return;
    }
    if (mode === "signup") {
      setMsg("가입 완료! 확인 메일이 발송됐다면 인증 후 로그인해 주세요.");
      setBusy(false);
      return;
    }
    await mergeLocalToCloud(); // 브라우저에 담아둔 관심종목을 계정으로 이전
    router.push("/watchlist");
  };

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card">
      <label className="mb-1.5 block text-[12px] text-fg-muted">이메일</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mb-4 w-full rounded-chip border border-border-strong bg-elevated px-3.5 py-2.5 text-[13px] text-fg outline-none focus:border-stronger"
      />
      <label className="mb-1.5 block text-[12px] text-fg-muted">비밀번호</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="6자 이상"
        onKeyDown={(e) => e.key === "Enter" && submit("signin")}
        className="mb-5 w-full rounded-chip border border-border-strong bg-elevated px-3.5 py-2.5 text-[13px] text-fg outline-none focus:border-stronger"
      />
      {msg && <div className="mb-4 text-[12px] text-warn">{msg}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !email || !password}
          onClick={() => submit("signin")}
          className="flex-1 rounded-chip bg-bull px-4 py-2.5 text-[13px] font-semibold text-white shadow-tile transition-opacity disabled:opacity-40"
        >
          로그인
        </button>
        <button
          type="button"
          disabled={busy || !email || !password}
          onClick={() => submit("signup")}
          className="flex-1 rounded-chip border border-border-strong bg-elevated px-4 py-2.5 text-[13px] text-fg shadow-tile transition-colors hover:border-stronger disabled:opacity-40"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="rounded-card border border-warn-border bg-surface p-6 shadow-card">
      <div className="mb-3 text-[14px] font-semibold text-warn">Supabase 인증 설정 필요</div>
      <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-fg-muted">
        <li>
          Supabase 대시보드 → <strong className="text-fg">Settings → API</strong>에서{" "}
          <code className="rounded bg-elevated px-1">Project URL</code>과{" "}
          <code className="rounded bg-elevated px-1">anon public key</code>를 복사
        </li>
        <li>
          <code className="rounded bg-elevated px-1">frontend/.env.local</code>에 추가:
          <pre className="mt-1.5 overflow-x-auto rounded-chip bg-elevated p-3 text-[11px] leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`}
          </pre>
        </li>
        <li>
          SQL Editor에서 <code className="rounded bg-elevated px-1">docs/supabase.sql</code> 실행
          (관심종목 테이블 + 보안 정책)
        </li>
        <li>프론트 서버 재시작 (npm run dev)</li>
      </ol>
      <p className="mt-4 text-[12px] text-fg-dim">
        설정 전에도 관심종목은 이 브라우저(localStorage)에 정상 저장됩니다.
      </p>
    </div>
  );
}
