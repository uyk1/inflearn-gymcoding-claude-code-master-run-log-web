import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceLabel, formatDuration, formatPaceLabel } from "@/lib/notion/duration";
import type { PeriodStatsDto } from "@/lib/runs/stats";

// 한 기간(이번 주 또는 이번 달)의 합계를 보여 줍니다. 값 길이와 상관없이 3열 구조를 유지합니다
export function StatsSummary({ title, stats }: { title: string; stats: PeriodStatsDto }) {
  const items = [
    { label: "총 거리", value: formatDistanceLabel(stats.totalDistanceKm) },
    { label: "총 시간", value: formatDuration(stats.totalDurationSeconds) },
    { label: "평균 페이스", value: formatPaceLabel(stats.avgPaceSecondsPerKm) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="text-foreground text-sm font-medium whitespace-nowrap tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">집계된 기록 {stats.runCount}건</p>
      </CardContent>
    </Card>
  );
}
