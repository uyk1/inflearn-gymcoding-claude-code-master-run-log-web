import { EmptyState } from "@/components/common/empty-state";
import { ErrorMessage } from "@/components/common/error-message";
import { ExcludedNotice } from "@/components/runs/excluded-notice";
import { DistanceChart } from "@/components/stats/distance-chart";
import { PaceChart } from "@/components/stats/pace-chart";
import { StatsSummary } from "@/components/stats/stats-summary";
import { StatsViewTabs } from "@/components/stats/stats-view-tabs";
import { getTodayInKorea } from "@/lib/runs/date";
import { loadRunRecords } from "@/lib/runs/load";
import { buildPeriodStats, type StatsGranularity } from "@/lib/runs/stats";

// searchParams를 쓰는 동적 페이지라 페이지 캐시는 아닙니다. 노션 조회는 lib/runs/load.ts에서 기본 60초 캐시합니다
export const revalidate = 60;

// 차트에 보여 줄 기간 수입니다. 360px 폭에서 X축 라벨이 겹치지 않는 범위로 정했습니다
const PERIOD_COUNT: Record<StatsGranularity, number> = { week: 8, month: 6 };
const SUMMARY_TITLE: Record<StatsGranularity, string> = { week: "이번 주", month: "이번 달" };
const RANGE_LABEL: Record<StatsGranularity, string> = { week: "최근 8주", month: "최근 6개월" };

// 주소의 view 값을 허용된 값으로 좁힙니다. 없거나 잘못되면(배열이거나 대소문자가 다른 값 포함) 주간을 보여 줍니다
function parseView(value: string | string[] | undefined): StatsGranularity {
  return value === "month" ? "month" : "week";
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = parseView(viewParam);

  const { records, excluded, errorMessage } = await loadRunRecords();
  const stats = buildPeriodStats(records, view, getTodayInKorea(), PERIOD_COUNT[view]);
  const current = stats.at(-1);
  const hasAnyRun = stats.some((period) => period.runCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">통계</h1>
        <StatsViewTabs current={view} />
      </div>

      {/* 제외된 기록은 합계에 들어가지 않으므로 목록과 같은 안내를 보여 줍니다 */}
      <ExcludedNotice items={excluded} />

      {errorMessage ? (
        <ErrorMessage message={errorMessage} />
      ) : records.length === 0 ? (
        <EmptyState>아직 기록이 없습니다. 노션에서 기록을 추가해 주세요.</EmptyState>
      ) : (
        <>
          {current ? <StatsSummary title={SUMMARY_TITLE[view]} stats={current} /> : null}
          {hasAnyRun ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DistanceChart data={stats} granularity={view} />
              <PaceChart data={stats} granularity={view} />
            </div>
          ) : (
            <EmptyState>{RANGE_LABEL[view]} 동안 집계된 기록이 없습니다.</EmptyState>
          )}
        </>
      )}
    </div>
  );
}
