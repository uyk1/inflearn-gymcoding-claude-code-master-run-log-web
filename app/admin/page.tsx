import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/admin/logout-button";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isValidSessionToken } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "관리자 | Run Log",
  robots: { index: false, follow: false },
};

// 관리자 홈(임시): 로그인 여부와 로그아웃을 확인하기 위한 최소 화면입니다.
// 세션 확인은 V2-P1-3에서 미들웨어와 레이아웃으로 옮겨 /admin 전체를 보호합니다
export default async function AdminHomePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSessionToken(token))) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
        <p className="text-muted-foreground text-sm break-keep">로그인되어 있습니다.</p>
      </div>
      <LogoutButton />
    </div>
  );
}
