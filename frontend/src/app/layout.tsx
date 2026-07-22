import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MA Signal · 이동평균 기반 국내주식 분석",
  description: "이동평균선 기반 기술적 분석으로 상방/하방 확률과 근거를 리포트합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
