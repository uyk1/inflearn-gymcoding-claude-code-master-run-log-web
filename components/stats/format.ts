import type { PeriodStatsDto, StatsGranularity } from "@/lib/runs/stats";

// 통계 차트의 X축 눈금과 툴팁 제목을 만드는 순수 함수입니다. "use client" 파일이 아니라서 어디서든 import할 수 있습니다

// X축 눈금 라벨입니다. 주간은 "11/02", 월간은 "11월"
export function formatTickLabel(start: string, granularity: StatsGranularity): string {
  const [, month, day] = start.split("-");
  return granularity === "week" ? `${month}/${day}` : `${Number(month)}월`;
}

// 툴팁 제목입니다. 주간은 "2026.11.02 ~ 11.08", 월간은 "2026년 11월"
export function formatTooltipLabel(item: PeriodStatsDto, granularity: StatsGranularity): string {
  const [year, month, day] = item.start.split("-");
  if (granularity === "month") return `${year}년 ${Number(month)}월`;
  const [, endMonth, endDay] = item.end.split("-");
  return `${year}.${month}.${day} ~ ${endMonth}.${endDay}`;
}
