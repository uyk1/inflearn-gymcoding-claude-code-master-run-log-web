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
        {/* 기록은 있는데 페이스가 비어 있으면 허용 범위를 벗어나 숨긴 것이므로 이유를 알려 줍니다 */}
        {stats.runCount > 0 && stats.avgPaceSecondsPerKm === null ? (
          <p className="text-muted-foreground text-xs">
            평균 페이스가 허용 범위를 벗어나 표시하지 않습니다. 거리와 시간을 확인해 주세요.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
