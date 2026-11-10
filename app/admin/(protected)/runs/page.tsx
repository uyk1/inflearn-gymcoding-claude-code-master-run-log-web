import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FOCUS_RING } from "@/lib/focus-ring";
import { formatDistanceLabel, formatPaceLabel } from "@/lib/notion/duration";
import { formatKoreanDate } from "@/lib/runs/date";
import { loadRunRecords } from "@/lib/runs/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "기록 목록 | Run Log",
  robots: { index: false, follow: false },
};

// 관리자 전용 기록 목록입니다. 공개 화면에는 관리자 링크를 두지 않으므로(쿠키를 읽으면 공개 화면이 동적이 됨) 수정은 여기서 시작합니다
export default async function AdminRunsPage() {
  await requireAdmin();
  const { records, errorMessage } = await loadRunRecords();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-6">
      <div className="space-y-2">
        <Link href="/admin" className={cn(FOCUS_RING, "text-muted-foreground hover:text-foreground inline-block rounded-sm text-sm")}>
          ← 관리자
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">기록 목록</h1>
        <p className="text-muted-foreground text-sm break-keep">기록을 눌러 수정하거나 삭제합니다.</p>
      </div>
      <Link href="/admin/runs/new" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        기록 입력
      </Link>

      {errorMessage ? (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage} 잠시 후 다시 시도해 주세요.
        </p>
      ) : records.length === 0 ? (
        <p className="text-muted-foreground text-sm">아직 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li key={record.id}>
              <Link href={`/admin/runs/${record.id}/edit`} className={cn(FOCUS_RING, "block rounded-xl")}>
                <Card className="hover:bg-muted-foreground/10 transition-colors">
                  <CardHeader>
                    <p className="text-muted-foreground text-sm">{formatKoreanDate(record.date)}</p>
                    <CardTitle className="truncate">{record.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm tabular-nums">
                    {formatDistanceLabel(record.distanceKm)} · {record.durationText} · {formatPaceLabel(record.paceSecondsPerKm)}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
