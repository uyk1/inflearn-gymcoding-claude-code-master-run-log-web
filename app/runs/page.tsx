import { EmptyState } from "@/components/common/empty-state";
import { ErrorMessage } from "@/components/common/error-message";
import { PeriodTabs } from "@/components/runs/period-tabs";
import { RunCard } from "@/components/runs/run-card";
import { loadRunRecords } from "@/lib/runs/load";
import { getPeriodRange, getTodayInKorea, isInRange, parsePeriod } from "@/lib/runs/date";

// searchParams를 쓰는 동적 페이지라 페이지 캐시는 아닙니다. 노션 조회는 lib/runs/load.ts에서 기본 60초 캐시합니다
export const revalidate = 60;

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  const { records, errorMessage } = await loadRunRecords();
  const range = getPeriodRange(period, getTodayInKorea());
  const filtered = records.filter((record) => isInRange(record.date, range));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">러닝 기록</h1>
        <PeriodTabs current={period} />
      </div>

      {errorMessage ? (
        <ErrorMessage message={errorMessage} />
      ) : filtered.length === 0 ? (
        <EmptyState>해당 기간의 기록이 없습니다.</EmptyState>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{filtered.length}건</p>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((record) => (
              <li key={record.id}>
                <RunCard record={record} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
