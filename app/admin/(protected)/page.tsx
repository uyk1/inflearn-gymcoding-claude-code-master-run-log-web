import type { Metadata } from "next";
import Link from "next/link";

import { LogoutButton } from "@/components/admin/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { loadRunRecords } from "@/lib/runs/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "관리자 | Run Log",
  robots: { index: false, follow: false },
};

// 관리자 홈: 관리 작업으로 가는 입구입니다. 기록 입력, 목록(수정·삭제)으로 가는 입구입니다
export default async function AdminHomePage() {
  // 레이아웃과 별개로 페이지에서도 확인합니다(레이아웃은 클라이언트 이동 때 다시 실행되지 않을 수 있음)
  await requireAdmin();
  // 공개 화면과 같은 조회 캐시를 읽으므로 노션 호출이 늘지 않습니다. 제외 건수는 부가 안내라서, 조회 설정이나
  // 노션 오류(공개 조회용 키 누락 등)로 실패해도 관리자 홈(입력·로그아웃)은 그대로 쓸 수 있게 안내 줄만 생략합니다
  const excludedCount = await loadRunRecords()
    .then((result) => result.excluded.length)
    .catch(() => 0);

  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
        <p className="text-muted-foreground text-sm break-keep">로그인되어 있습니다.</p>
      </div>
      {excludedCount > 0 && (
        <p className="text-sm break-keep">
          입력값에 문제가 있어 목록에서 제외된 기록이 {excludedCount}건 있습니다.{" "}
          <Link href="/admin/runs" className="underline underline-offset-4">
            기록 목록에서 고치기
          </Link>
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/admin/runs/new" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          기록 입력
        </Link>
        <Link href="/admin/runs" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}>
          기록 목록
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
