import type { Metadata } from "next";
import Link from "next/link";

import { RunForm } from "@/components/admin/run-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FOCUS_RING } from "@/lib/focus-ring";
import { getTodayInKorea } from "@/lib/runs/date";
import { cn } from "@/lib/utils";

// 관리자 화면은 검색에 노출하지 않습니다
export const metadata: Metadata = {
  title: "기록 입력 | Run Log",
  robots: { index: false, follow: false },
};

export default async function NewRunPage() {
  // 레이아웃과 별개로 페이지에서도 확인합니다(레이아웃은 클라이언트 이동 때 다시 실행되지 않을 수 있음)
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-6">
      <div className="space-y-2">
        <Link
          href="/admin"
          className={cn(FOCUS_RING, "text-muted-foreground hover:text-foreground inline-block rounded-sm text-sm")}
        >
          ← 관리자
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">기록 입력</h1>
        <p className="text-muted-foreground text-sm break-keep">러닝 기록을 입력하면 노션에 저장되고 공개 화면에 반영됩니다.</p>
      </div>
      {/* 날짜 기본값은 서버가 한국 시간 기준으로 정해 넘깁니다(서버·브라우저 렌더링이 어긋나지 않게) */}
      <RunForm today={getTodayInKorea()} />
    </div>
  );
}
