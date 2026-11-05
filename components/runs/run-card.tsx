import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunRecordDto } from "@/lib/notion/dto";
import { formatDistanceLabel, formatPaceLabel } from "@/lib/notion/duration";
import { formatKoreanDate } from "@/lib/runs/date";
import { FOCUS_RING } from "@/lib/focus-ring";
import { cn } from "@/lib/utils";

// 기록 한 건을 카드로 보여 줍니다. 누르면 상세 화면으로 이동합니다
export function RunCard({ record }: { record: RunRecordDto }) {
  return (
    <Link
      href={`/runs/${record.id}`}
      className={cn(FOCUS_RING, "block rounded-xl")}
    >
      <Card className="hover:bg-muted-foreground/10 transition-colors">
        <CardHeader>
          <p className="text-muted-foreground text-sm">{formatKoreanDate(record.date)}</p>
          <CardTitle className="truncate">{record.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 값 길이와 상관없이 모든 카드가 3열 구조가 되도록 격자로 고정합니다. 높이는 app/runs/loading.tsx의 자리표시와 맞춘 값이니 함께 고치세요 */}
          <dl className="grid grid-cols-3 gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-muted-foreground text-xs">거리</dt>
              <dd className="text-foreground text-sm font-medium whitespace-nowrap tabular-nums">
                {formatDistanceLabel(record.distanceKm)}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-muted-foreground text-xs">시간</dt>
              <dd className="text-foreground text-sm font-medium whitespace-nowrap tabular-nums">
                {record.durationText}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-muted-foreground text-xs">페이스</dt>
              <dd className="text-foreground text-sm font-medium whitespace-nowrap tabular-nums">
                {formatPaceLabel(record.paceSecondsPerKm)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
