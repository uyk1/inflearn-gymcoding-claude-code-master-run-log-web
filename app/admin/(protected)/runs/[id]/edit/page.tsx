import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteRun } from "@/components/admin/delete-run";
import { EditRunForm } from "@/components/admin/edit-run-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AppError } from "@/lib/errors";
import { FOCUS_RING } from "@/lib/focus-ring";
import { createAdminRunService } from "@/lib/notion/admin/container";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "기록 수정 | Run Log",
  robots: { index: false, follow: false },
};

// 수정 화면입니다. 입력칸 값은 공유 캐시가 아니라 노션에서 직접 읽은 원문이고, 저장 때 충돌 확인에 쓸 내용 버전을 함께 받습니다
export default async function EditRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const result = await createAdminRunService()
    .getRunForEdit(id)
    .catch((error: unknown) => {
      // 없거나 이미 삭제된 기록은 404 화면으로, 그 밖의 실패는 오류 화면(error.tsx)으로 넘깁니다
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    });
  if (!result || !result.ok) notFound();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-6">
      <div className="space-y-2">
        <Link href="/admin/runs" className={cn(FOCUS_RING, "text-muted-foreground hover:text-foreground inline-block rounded-sm text-sm")}>
          ← 기록 목록
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">기록 수정</h1>
      </div>
      <EditRunForm id={result.id} initialValues={result.values} initialVersion={result.version} />
      <div className="border-t pt-6">
        <DeleteRun id={result.id} title={result.values.title || "(제목 없음)"} />
      </div>
    </div>
  );
}
