"use client";

// recharts와 ChartContainer가 브라우저에서 크기를 재므로 클라이언트 컴포넌트입니다
import { useId } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/common/empty-state";
import { formatTickLabel, formatTooltipLabel } from "@/components/stats/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPaceLabel } from "@/lib/notion/duration";
import type { PeriodStatsDto, StatsGranularity } from "@/lib/runs/stats";

const chartConfig = {
  avgPaceSecondsPerKm: {
    label: "평균 페이스",
    // 다크에서 --chart-3은 배경과 대비가 3:1 미만이라 글자색 토큰으로 바꿉니다
    theme: { light: "var(--chart-3)", dark: "var(--muted-foreground)" },
  },
} satisfies ChartConfig;

// Y축 눈금용 짧은 m:ss입니다("/km" 없음)
function formatPaceTick(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

// 기간별 평균 페이스를 선으로 보여 줍니다. 값이 작을수록 빠르므로 Y축을 뒤집어 빠른 쪽이 위로 가게 합니다
export function PaceChart({
  data,
  granularity,
}: {
  data: PeriodStatsDto[];
  granularity: StatsGranularity;
}) {
  const summaryId = useId();
  const paces = data
    .map((item) => item.avgPaceSecondsPerKm)
    .filter((pace): pace is number => pace !== null);
  const fastest = data.reduce<PeriodStatsDto | null>(
    (best, item) =>
      item.avgPaceSecondsPerKm !== null &&
      (best === null || item.avgPaceSecondsPerKm < (best.avgPaceSecondsPerKm ?? Infinity))
        ? item
        : best,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>평균 페이스 추이</CardTitle>
        <CardDescription>km당 시간, 위로 갈수록 빠릅니다</CardDescription>
      </CardHeader>
      <CardContent>
        {paces.length === 0 ? (
          <EmptyState>표시할 페이스가 없습니다</EmptyState>
        ) : (
          <>
            {/* 차트 svg가 키보드로 포커스될 때만 링이 보이게 합니다(chart.tsx가 svg outline을 숨김) */}
            <div
          role="group"
          aria-label="평균 페이스 추이 차트"
          aria-describedby={summaryId}
          className="has-focus-visible:ring-ring has-focus-visible:ring-offset-background rounded-md outline-hidden has-focus-visible:ring-2 has-focus-visible:ring-offset-2"
        >
              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="start"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={4}
                    padding={{ left: 8, right: 8 }}
                    tick={{ fill: "var(--muted-foreground)" }}
                    tickFormatter={(value: string) => formatTickLabel(value, granularity)}
                  />
                  <YAxis
                    reversed
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    // 30초 단위로 여유를 둬 점이 위아래 끝에 붙지 않게 합니다
                    domain={[
                      (dataMin: number) => Math.floor((dataMin - 15) / 30) * 30,
                      (dataMax: number) => Math.ceil((dataMax + 15) / 30) * 30,
                    ]}
                    tickFormatter={(value: number) => formatPaceTick(value)}
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
                            <span className="text-muted-foreground">평균 페이스</span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {formatPaceLabel(typeof value === "number" ? value : null)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Line
                    dataKey="avgPaceSecondsPerKm"
                    type="linear"
                    stroke="var(--color-avgPaceSecondsPerKm)"
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill: "var(--color-avgPaceSecondsPerKm)",
                      stroke: "var(--background)",
                      strokeWidth: 1,
                    }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <p id={summaryId} className="sr-only">
              {fastest
                ? `가장 빠른 기간은 ${formatTooltipLabel(fastest, granularity)}, ${formatPaceLabel(fastest.avgPaceSecondsPerKm)}입니다.`
                : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
