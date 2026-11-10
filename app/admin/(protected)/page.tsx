import type { Metadata } from "next";
import Link from "next/link";

import { LogoutButton } from "@/components/admin/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "관리자 | Run Log",
  robots: { index: false, follow: false },
};

// 관리자 홈: 관리 작업으로 가는 입구입니다. 기록 입력이 있고, 수정·삭제는 이후 단계에서 추가합니다
export default async function AdminHomePage() {
  // 레이아웃과 별개로 페이지에서도 확인합니다(레이아웃은 클라이언트 이동 때 다시 실행되지 않을 수 있음)
  await requireAdmin();

  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
        <p className="text-muted-foreground text-sm break-keep">로그인되어 있습니다.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/admin/runs/new" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          기록 입력
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
