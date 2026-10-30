import { PeriodTabs } from "@/components/runs/period-tabs";
import { RunCard } from "@/components/runs/run-card";
import { loadRunRecords } from "@/lib/runs/load";
import { getPeriodRange, getTodayInKorea, isInRange, parsePeriod } from "@/lib/runs/date";

// 노션 데이터를 5분마다 다시 가져옵니다
export const revalidate = 300;

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
        <p className="text-destructive text-sm">{errorMessage}</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">해당 기간의 기록이 없습니다.</p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{filtered.length}건</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((record) => (
              <RunCard key={record.id} record={record} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
