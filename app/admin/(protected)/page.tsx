import type { Metadata } from "next";

import { LogoutButton } from "@/components/admin/logout-button";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "관리자 | Run Log",
  robots: { index: false, follow: false },
};

// 관리자 홈: 로그인과 보호를 확인하는 최소 화면입니다. 기록 입력·수정은 이후 단계에서 추가합니다
export default async function AdminHomePage() {
  // 레이아웃과 별개로 페이지에서도 확인합니다(레이아웃은 클라이언트 이동 때 다시 실행되지 않을 수 있음)
  await requireAdmin();

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
