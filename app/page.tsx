import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { RunCard } from "@/components/runs/run-card";
import { loadRunRecords } from "@/lib/runs/load";
import { getPeriodRange, getTodayInKorea, isInRange } from "@/lib/runs/date";

// 노션 데이터를 5분마다 다시 가져옵니다 (PRD 8장: API 호출 수 줄이기)
export const revalidate = 300;

const RECENT_COUNT = 3;

export default async function HomePage() {
  const { records, errorMessage } = await loadRunRecords();

  const today = getTodayInKorea();
  const weekRange = getPeriodRange("week", today);
  const weekRecords = records.filter((record) => isInRange(record.date, weekRange));
  const weekDistance = weekRecords.reduce((sum, record) => sum + record.distanceKm, 0);
  const recentRecords = records.slice(0, RECENT_COUNT);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Run Log</h1>
        <div className="bg-muted/50 rounded-lg border p-6">
          <p className="text-muted-foreground text-sm">이번 주 총 거리</p>
          <p className="mt-1 text-4xl font-bold">
            {weekDistance.toFixed(1)} <span className="text-lg font-medium">km</span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm">이번 주 기록 {weekRecords.length}건</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">최근 기록</h2>
          <Link href="/runs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            전체 보기
          </Link>
        </div>

        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : recentRecords.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 기록이 없습니다. 노션에서 기록을 추가해 주세요.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recentRecords.map((record) => (
              <RunCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
