import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunRecordDto } from "@/lib/notion/dto";
import { formatPaceLabel } from "@/lib/notion/duration";
import { formatKoreanDate } from "@/lib/runs/date";

// 기록 한 건을 카드로 보여 줍니다. 누르면 상세 화면으로 이동합니다
export function RunCard({ record }: { record: RunRecordDto }) {
  return (
    <Link
      href={`/runs/${record.id}`}
      className="focus-visible:ring-ring focus-visible:ring-offset-background block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Card className="hover:bg-muted-foreground/10 transition-colors">
        <CardHeader>
          <p className="text-muted-foreground text-sm">{formatKoreanDate(record.date)}</p>
          <CardTitle className="truncate">{record.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex gap-1">
              <dt className="text-muted-foreground">거리</dt>
              <dd>{record.distanceKm} km</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted-foreground">시간</dt>
              <dd>{record.durationText}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted-foreground">페이스</dt>
              <dd>{formatPaceLabel(record.paceText)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
