import { redirect } from "next/navigation";

export default function Home() {
  // 기본 삼성전자로 진입. 검색은 TopBar에서.
  redirect("/analyze/005930");
}
