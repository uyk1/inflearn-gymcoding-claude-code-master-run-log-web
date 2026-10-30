import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunRecordDto } from "@/lib/notion/dto";
import { formatKoreanDate } from "@/lib/runs/date";

// 기록 한 건을 카드로 보여 줍니다. 누르면 상세 화면으로 이동합니다
export function RunCard({ record }: { record: RunRecordDto }) {
  return (
    <Link href={`/runs/${record.id}`} className="block">
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <p className="text-muted-foreground text-sm">{formatKoreanDate(record.date)}</p>
          <CardTitle className="truncate">{record.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            <span className="text-muted-foreground">거리 </span>
            {record.distanceKm} km
          </span>
          <span>
            <span className="text-muted-foreground">시간 </span>
            {record.durationText}
          </span>
          <span>
            <span className="text-muted-foreground">페이스 </span>
            {record.paceText}/km
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
