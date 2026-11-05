"use client";

// recharts와 ChartContainer가 브라우저에서 크기를 재므로 클라이언트 컴포넌트입니다
import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatTickLabel, formatTooltipLabel } from "@/components/stats/format";
import { formatDistanceLabel } from "@/lib/notion/duration";
import type { PeriodStatsDto, StatsGranularity } from "@/lib/runs/stats";

const chartConfig = {
  totalDistanceKm: { label: "총 거리", color: "var(--chart-2)" },
} satisfies ChartConfig;

// 기간별 총 거리를 막대로 보여 줍니다. 페이스 선 차트와 색이 아니라 형태로 구분합니다
export function DistanceChart({
  data,
  granularity,
}: {
  data: PeriodStatsDto[];
  granularity: StatsGranularity;
}) {
  const summaryId = useId();
  const unit = granularity === "week" ? "주별" : "월별";
  const maxItem = data.reduce<PeriodStatsDto | null>(
    (max, item) => (max === null || item.totalDistanceKm > max.totalDistanceKm ? item : max),
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>거리 추이</CardTitle>
        <CardDescription>{unit} 총 거리 (km)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 차트 svg가 키보드로 포커스될 때만 링이 보이게 합니다(chart.tsx가 svg outline을 숨김) */}
        <div
          role="group"
          aria-label="거리 추이 차트"
          aria-describedby={summaryId}
          className="has-focus-visible:ring-ring has-focus-visible:ring-offset-background rounded-md outline-hidden has-focus-visible:ring-2 has-focus-visible:ring-offset-2"
        >
          <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="start"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={4}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={(value: string) => formatTickLabel(value, granularity)}
              />
              <YAxis
                width={32}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                // 눈금이 정수로 떨어지도록 최댓값을 4의 배수로 올립니다(모두 0이어도 4)
                domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax / 4) * 4, 4)]}
                tickCount={5}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      payload?.[0]
                        ? formatTooltipLabel(payload[0].payload as PeriodStatsDto, granularity)
                        : null
                    }
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">총 거리</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatDistanceLabel(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="totalDistanceKm"
                fill="var(--color-totalDistanceKm)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
        <p id={summaryId} className="sr-only">
          {maxItem
            ? `${data.length}개 ${unit} 기간 중 거리가 가장 긴 기간은 ${formatTooltipLabel(maxItem, granularity)}, ${formatDistanceLabel(maxItem.totalDistanceKm)}입니다.`
            : "표시할 기간이 없습니다."}
        </p>
      </CardContent>
    </Card>
  );
}
